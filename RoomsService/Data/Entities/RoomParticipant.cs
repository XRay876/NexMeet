namespace RoomsService.Data.Entities;

public class RoomParticipant
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid? UserId { get; set; } // Null if guest
    public string? GuestName { get; set; } // Null if registered member
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Room Room { get; set; } = null!;
}