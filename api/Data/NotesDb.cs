using Microsoft.EntityFrameworkCore;

namespace F1PitWall.Api.Data;

/// User-owned data, kept in its own SQLite file so the race cache can be rebuilt without touching it.
public class NotesDb(DbContextOptions<NotesDb> options) : DbContext(options)
{
    public DbSet<RaceNote> Notes => Set<RaceNote>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<RaceNote>().HasIndex(n => new { n.OwnerId, n.RaceKey });
        b.Entity<RaceNote>().Property(n => n.Title).HasMaxLength(RaceNote.TitleMax);
        b.Entity<RaceNote>().Property(n => n.Body).HasMaxLength(RaceNote.BodyMax);
    }
}

public class RaceNote
{
    public const int TitleMax = 80;
    public const int BodyMax = 500;
    public static readonly string[] Categories = ["Strategy", "Incident", "Tyres"];

    public Guid Id { get; set; }
    public string OwnerId { get; set; } = "";
    public int RaceKey { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Category { get; set; } = "";
    public int Lap { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    /// Soft delete: hidden from the owner's lists but kept until they erase their data.
    public DateTimeOffset? DeletedAt { get; set; }
}
