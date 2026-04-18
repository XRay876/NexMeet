using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomsService.Data.Entities;

namespace RoomsService.Data.Configurations;

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.OwnerId);

        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
        builder.Property(x => x.OwnerId).IsRequired();
        builder.Property(x => x.IsActive).HasDefaultValue(true);
    }
}