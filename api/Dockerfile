FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY api/F1PitWall.Api.csproj api/
RUN dotnet restore api/F1PitWall.Api.csproj
COPY api/ api/
RUN dotnet publish api/F1PitWall.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080 \
    Database__Path=/data/pitwall.db
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "F1PitWall.Api.dll"]
