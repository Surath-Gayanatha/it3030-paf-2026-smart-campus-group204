package com.smartcampus.backend.service;

import com.smartcampus.backend.dto.TicketRequest;
import com.smartcampus.backend.dto.TicketResponse;
import com.smartcampus.backend.dto.TicketStatusRequest;
import com.smartcampus.backend.model.Ticket;
import com.smartcampus.backend.model.TicketPriority;
import com.smartcampus.backend.model.TicketStatus;
import com.smartcampus.backend.model.NotificationType;
import com.smartcampus.backend.model.User;
import com.smartcampus.backend.model.Role;
import com.smartcampus.backend.repository.TicketRepository;
import com.smartcampus.backend.repository.UserRepository;
import com.smartcampus.backend.services.NotificationService;
import com.smartcampus.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.Optional;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import com.smartcampus.backend.dto.TicketStatsResponse;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;
    private final UserService userService;
    private final UserRepository userRepository;

    // Helper: get current username safely (defaults to 'anonymous' when security is open)
    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "anonymous";
        }
        return auth.getName();
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    public TicketResponse createTicket(TicketRequest request) {
        String currentUser = getCurrentUser();

        Ticket ticket = Ticket.builder()
                .resourceLocation(request.getResourceLocation())
                .category(request.getCategory())
                .description(request.getDescription())
                .priority(request.getPriority())
                .contactName(request.getContactName())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new ArrayList<>())
                .createdBy(currentUser)
                .status(TicketStatus.OPEN)
                .build();

            Ticket savedTicket = ticketRepository.save(ticket);

            List<User> admins = userRepository.findByRole(Role.ADMIN);
            for (User admin : admins) {
                notificationService.createNotification(
                    admin.getId(),
                    "New Ticket Created",
                    "A new support ticket has been submitted: Ticket #" + savedTicket.getId().substring(Math.max(0, savedTicket.getId().length() - 5)),
                    NotificationType.NEW_TICKET_CREATED,
                    savedTicket.getId()
                );
            }

            return mapToResponse(savedTicket);
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    public TicketResponse getTicketById(String id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + id));
        return mapToResponse(ticket);
    }

    // Admin: all tickets with optional filters
    public List<TicketResponse> getAllTickets(TicketStatus status, TicketPriority priority) {
        List<Ticket> tickets;

        if (status != null && priority != null) {
            tickets = ticketRepository.findByStatusAndPriority(status, priority);
        } else if (status != null) {
            tickets = ticketRepository.findByStatus(status);
        } else if (priority != null) {
            tickets = ticketRepository.findByPriority(priority);
        } else {
            tickets = ticketRepository.findAll();
        }

        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // User: only their own tickets
    public List<TicketResponse> getMyTickets(TicketStatus status) {
        String currentUser = getCurrentUser();

        List<Ticket> tickets = (status != null)
                ? ticketRepository.findByCreatedByAndStatus(currentUser, status)
                : ticketRepository.findByCreatedBy(currentUser);

        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // Technician: only tickets assigned to them
    public List<TicketResponse> getAssignedTickets() {
        User currentUser = userService.getCurrentUser();
        List<Ticket> tickets = ticketRepository.findByAssignedTechnicianId(currentUser.getId());
        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ── UPLOAD IMAGES ─────────────────────────────────────────────────────────

    public TicketResponse uploadImages(String id, List<MultipartFile> files) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + id));

        // Max 3 images limit logic
        if (ticket.getImageUrls() == null) {
            ticket.setImageUrls(new ArrayList<>());
        }
        
        int availableSlots = 3 - ticket.getImageUrls().size();
        if (availableSlots <= 0 || files.isEmpty()) {
            return mapToResponse(ticket);
        }

        List<MultipartFile> filesToUpload = files.stream().limit(availableSlots).collect(Collectors.toList());

        // Delegate to CloudinaryService
        List<String> uploadedUrls = cloudinaryService.uploadImages(filesToUpload);
        ticket.getImageUrls().addAll(uploadedUrls);

        return mapToResponse(ticketRepository.save(ticket));
    }

    // ── UPDATE STATUS ────────────────────────────────────────────────────────
    
    public TicketResponse updateTicketStatus(String id, TicketStatusRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + id));

        TicketStatus oldStatus = ticket.getStatus();

        if (request.getStatus() != null) {
            ticket.setStatus(request.getStatus());
        }
        
        if (request.getAssignedTechnician() != null) {
            ticket.setAssignedTechnician(request.getAssignedTechnician());
        }

        String requestedTechnicianId = request.getAssignedTechnicianId();
        if (requestedTechnicianId == null && request.getAssignedTechnician() != null) {
            String technicianKey = request.getAssignedTechnician().trim();
            if (!technicianKey.isEmpty()) {
                Optional<User> resolvedUser = technicianKey.contains("@")
                        ? userService.findByEmail(technicianKey)
                        : userRepository.findByNameIgnoreCase(technicianKey);
                if (resolvedUser.isPresent()) {
                    requestedTechnicianId = resolvedUser.get().getId();
                }
            }
        }

        if (requestedTechnicianId != null && !requestedTechnicianId.equals(ticket.getAssignedTechnicianId())) {
            ticket.setAssignedTechnicianId(requestedTechnicianId);

            // Trigger Notification
            notificationService.createNotification(
                    requestedTechnicianId,
                    "Ticket Assigned",
                    "You have been assigned to handle maintenance ticket #" + ticket.getId().substring(Math.max(0, ticket.getId().length() - 5)),
                    NotificationType.TICKET_STATUS_CHANGED,
                    ticket.getId()
            );
        }
        
        if (request.getResolutionNotes() != null) {
            ticket.setResolutionNotes(request.getResolutionNotes());
        }
        
        if (request.getRejectionReason() != null) {
            ticket.setRejectionReason(request.getRejectionReason());
        }

        // --- Post-update Notifications ---
        if (ticket.getStatus() != oldStatus) {
            String shortId = ticket.getId().substring(Math.max(0, ticket.getId().length() - 5));
            String statusMsg = "Ticket #" + shortId + " status updated to " + ticket.getStatus();
            
            // 1. Notify Creator (createdBy is their email)
            userService.findByEmail(ticket.getCreatedBy()).ifPresent(creator -> {
                notificationService.createNotification(
                        creator.getId(),
                        "Ticket Update",
                        statusMsg,
                        NotificationType.TICKET_STATUS_CHANGED,
                        ticket.getId()
                );
            });

            // 2. Notify Admins
            List<User> admins = userService.getUsersByRole(Role.ADMIN);
            for (User admin : admins) {
                // Don't notify the current user if they are an admin doing the update
                // (Optional refinement, but simple is better for now)
                notificationService.createNotification(
                        admin.getId(),
                        "Admin: Ticket Progress",
                        statusMsg,
                        NotificationType.TICKET_STATUS_CHANGED,
                        ticket.getId()
                );
            }
        }

        return mapToResponse(ticketRepository.save(ticket));
    }

    public TicketStatsResponse getTicketStats() {
        User currentUser = userService.getCurrentUser();
        List<Ticket> tickets;

        if (currentUser.getRole() == Role.ADMIN) {
            tickets = ticketRepository.findAll();
        } else {
            // For Technicians or Users, get their relevant tickets
            if (currentUser.getRole() == Role.TECHNICIAN) {
                tickets = ticketRepository.findByAssignedTechnicianId(currentUser.getId());
            } else {
                tickets = ticketRepository.findByCreatedBy(currentUser.getEmail());
            }
        }

        Map<String, Long> statusCounts = tickets.stream()
                .filter(t -> t.getStatus() != null)
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));
        
        Map<String, Long> priorityCounts = tickets.stream()
                .filter(t -> t.getPriority() != null)
                .collect(Collectors.groupingBy(t -> t.getPriority().name(), Collectors.counting()));
        
        Map<String, Long> categoryCounts = tickets.stream()
                .filter(t -> t.getCategory() != null)
                .collect(Collectors.groupingBy(t -> t.getCategory().name(), Collectors.counting()));

        // Advanced Analytics: Daily Trends (last 7 days mapping)
        DateTimeFormatter df = DateTimeFormatter.ofPattern("MMM dd");
        Map<String, Long> dailyTrends = tickets.stream()
                .filter(t -> t.getCreatedAt() != null)
                .collect(Collectors.groupingBy(t -> t.getCreatedAt().format(df), 
                         TreeMap::new, Collectors.counting()));

        // Advanced Analytics: Location Usage
        Map<String, Long> locationUsage = tickets.stream()
                .filter(t -> t.getResourceLocation() != null)
                .collect(Collectors.groupingBy(Ticket::getResourceLocation, Collectors.counting()));

        long total = tickets.size();
        long resolved = statusCounts.getOrDefault("RESOLVED", 0L) + statusCounts.getOrDefault("CLOSED", 0L);
        double rate = total == 0 ? 0 : (double) resolved / total * 100;

        return TicketStatsResponse.builder()
                .statusCounts(statusCounts)
                .priorityCounts(priorityCounts)
                .categoryCounts(categoryCounts)
                .dailyTrends(dailyTrends)
                .locationUsage(locationUsage)
                .totalTickets(total)
                .resolvedTickets(resolved)
                .resolutionRate(rate)
                .build();
    }

    public void deleteTicket(String id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found with id: " + id));

        User currentUser = userService.getCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isCreator = ticket.getCreatedBy().equals(currentUser.getEmail());

        if (!isAdmin && !isCreator) {
            throw new RuntimeException("You are not authorized to delete this ticket.");
        }

        if (!isAdmin && ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Only tickets in OPEN status can be deleted by users.");
        }

        ticketRepository.delete(ticket);
    }

    // ── MAPPER ────────────────────────────────────────────────────────────────

    private TicketResponse mapToResponse(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .resourceLocation(ticket.getResourceLocation())
                .category(ticket.getCategory())
                .description(ticket.getDescription())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .contactName(ticket.getContactName())
                .contactEmail(ticket.getContactEmail())
                .contactPhone(ticket.getContactPhone())
                .assignedTechnician(ticket.getAssignedTechnician())
                .assignedTechnicianId(ticket.getAssignedTechnicianId())
                .resolutionNotes(ticket.getResolutionNotes())
                .rejectionReason(ticket.getRejectionReason())
                .imageUrls(ticket.getImageUrls())
                .createdBy(ticket.getCreatedBy())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
