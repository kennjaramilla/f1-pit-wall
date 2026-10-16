namespace F1PitWall.Api.OpenF1;

/// Downloads the body inside the resilience pipeline, so attempt timeouts and retries also cover
/// responses that stall mid-body (OpenF1 does this under load).
public class BufferContentHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var response = await base.SendAsync(request, ct);
        await response.Content.LoadIntoBufferAsync(ct);
        return response;
    }
}
