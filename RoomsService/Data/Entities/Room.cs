namespace RoomsService.Data.Entities;

public class Room
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid OwnerId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }

    public ICollection<RoomParticipant> Participants { get; set; } = new List<RoomParticipant>();
}