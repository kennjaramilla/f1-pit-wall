using F1PitWall.Api.Domain;

namespace F1PitWall.Api.Tests;

public class RaceMathTests
{
    [Fact]
    public void Resample_interpolates_between_points()
    {
        var pts = new List<TimedPoint> { new(0, 0, 0), new(1000, 100, 200) };
        var frames = RaceMath.Resample(pts, 0, 250, 5);
        Assert.Equal((0, 0), frames[0]);
        Assert.Equal((50, 100), frames[2]);
        Assert.Equal((100, 200), frames[4]);
    }

    [Fact]
    public void Resample_leaves_gaps_and_out_of_range_frames_null()
    {
        var pts = new List<TimedPoint> { new(0, 0, 0), new(500, 10, 10), new(10_000, 99, 99) };
        var frames = RaceMath.Resample(pts, -500, 500, 6, maxGapMs: 4000);
        Assert.Null(frames[0]);          // before first sample
        Assert.Equal((10, 10), frames[2]);
        Assert.Null(frames[4]);          // inside a 9.5s data gap
    }

    [Fact]
    public void Crossings_prefer_next_lap_start_over_duration()
    {
        var c = RaceMath.Crossings([
            new LapTiming(1, 0, 90_000),
            new LapTiming(2, 90_500, null),
            new LapTiming(3, 181_000, 89_000),
        ]);
        Assert.Equal(90_500, c[1]);
        Assert.Equal(181_000, c[2]);
        Assert.Equal(270_000, c[3]);
    }

    [Fact]
    public void Gaps_are_relative_to_first_car_across_the_line_each_lap()
    {
        var crossings = new Dictionary<int, SortedDictionary<int, long>>
        {
            [1] = new() { [1] = 90_000, [2] = 181_000 },
            [4] = new() { [1] = 91_200, [2] = 180_500 },
            [16] = new() { [1] = 95_000 },
        };
        var gaps = RaceMath.GapsToLeader(crossings, 2);
        Assert.Equal(0, gaps[1][0]);
        Assert.Equal(1.2, gaps[4][0]);
        Assert.Equal(0.5, gaps[1][1]);   // leader changed on lap 2
        Assert.Equal(0, gaps[4][1]);
        Assert.Null(gaps[16][1]);        // retired
    }

    [Fact]
    public void Track_periods_open_on_deployment_and_close_on_track_clear()
    {
        var periods = RaceMath.TrackPeriods([
            (1_000, "SafetyCar", null, null, "SAFETY CAR DEPLOYED"),
            (5_000, "SafetyCar", null, null, "SAFETY CAR IN THIS LAP"),
            (8_000, "Flag", "GREEN", "Track", "TRACK CLEAR"),
            (20_000, "SafetyCar", null, null, "VIRTUAL SAFETY CAR DEPLOYED"),
            (24_000, "SafetyCar", null, null, "VIRTUAL SAFETY CAR ENDING"),
            (30_000, "Flag", "RED", "Track", "RED FLAG"),
        ], raceEndMs: 40_000);

        Assert.Equal([new TrackPeriod("sc", 1_000, 8_000), new TrackPeriod("vsc", 20_000, 24_000), new TrackPeriod("red", 30_000, 40_000)], periods);
    }

    [Fact]
    public void Distance_integrates_speed()
    {
        // 36 km/h = 10 m/s for 2 seconds
        var d = RaceMath.Distance([(0, 36), (1000, 36), (2000, 36)]);
        Assert.Equal(20, d[2], 3);
    }

    [Fact]
    public void LocationAt_interpolates_and_clamps()
    {
        var pts = new List<TimedPoint> { new(0, 0, 0), new(100, 10, 20), new(200, 30, 40) };
        Assert.Equal((5, 10), RaceMath.LocationAt(pts, 50));
        Assert.Equal((0, 0), RaceMath.LocationAt(pts, -10));
        Assert.Equal((30, 40), RaceMath.LocationAt(pts, 999));
        Assert.Null(RaceMath.LocationAt([], 0));
    }
}
