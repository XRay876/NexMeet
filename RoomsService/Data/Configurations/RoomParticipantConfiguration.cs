using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomsService.Data.Entities;

namespace RoomsService.Data.Configurations;

public class RoomParticipantConfiguration : IEntityTypeConfiguration<RoomParticipant>
{
    public void Configure(EntityTypeBuilder<RoomParticipant> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.RoomId);
        builder.HasIndex(x => x.UserId);

        builder.Property(x => x.GuestName).HasMaxLength(100);

        builder.HasOne(x => x.Room)
            .WithMany(r => r.Participants)
            .HasForeignKey(x => x.RoomId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}