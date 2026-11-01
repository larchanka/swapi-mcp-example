import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SwapiClient } from "../src/api-client.js";
import { loadConfig } from "../src/config.js";
import {
  filmOne,
  jsonResponse,
  paginated,
  personOne,
} from "./fixtures.js";

const config = loadConfig({});

function stubFetch(handler: (url: URL) => Response): URL[] {
  const calls: URL[] = [];
  const spy = vi.fn(async (input: URL) => {
    calls.push(input);
    return handler(input);
  });
  vi.stubGlobal("fetch", spy);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SwapiClient", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends requests to the base URL with format=json and parses the response", async () => {
    const calls = stubFetch(() => jsonResponse(paginated([filmOne])));

    const client = new SwapiClient(config);
    const films = await client.listFilms();

    expect(films).toEqual([filmOne]);
    expect(calls[0]?.href).toBe("https://swapi.dev/api/films/?format=json");
  });

  it("sends an Accept: application/json header", async () => {
    let init: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL, requestInit?: RequestInit) => {
        init = requestInit;
        return jsonResponse(personOne);
      }),
    );

    const client = new SwapiClient(config);
    await client.getPerson("https://swapi.dev/api/people/1/");

    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("builds the film detail URL from the film id", async () => {
    const calls = stubFetch(() => jsonResponse(filmOne));

    const client = new SwapiClient(config);
    const film = await client.getFilm(1);

    expect(film.episode_id).toBe(4);
    expect(calls[0]?.href).toBe("https://swapi.dev/api/films/1/?format=json");
  });

  it("throws ApiError with status and API detail on a 404 response", async () => {
    stubFetch(() => jsonResponse({ detail: "Not found" }, 404));

    const client = new SwapiClient(config);
    const promise = client.getFilm(999);

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 404,
      detail: "Not found",
      message: expect.stringContaining("HTTP 404"),
    });
  });

  it("throws ApiError with status even when the error body has no detail", async () => {
    stubFetch(() => new Response("<html>Server Error</html>", { status: 500 }));

    const client = new SwapiClient(config);
    await expect(client.listFilms()).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("HTTP 500"),
    });
  });

  it("wraps network failures as ApiError with status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const client = new SwapiClient(config);
    await expect(client.listFilms()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("fetch failed"),
    });
  });

  it("wraps timeouts with a clear message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new Error("The operation was aborted"), {
          name: "TimeoutError",
        });
      }),
    );

    const client = new SwapiClient(loadConfig({ SWAPI_TIMEOUT_MS: "5000" }));
    await expect(client.listFilms()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("timed out after 5000ms"),
    });
  });

  it("finds a film by episode number", async () => {
    stubFetch(() => jsonResponse(paginated([filmOne])));

    const client = new SwapiClient(config);
    const film = await client.findFilmByEpisode(4);

    expect(film?.title).toBe("A New Hope");
  });

  it("fetches resource with numeric id and applies search query parameters", async () => {
    const calls = stubFetch(() => jsonResponse(paginated([personOne])));

    const client = new SwapiClient(config);
    const result = await client.searchPeople("Luke", 2);

    expect(result.results).toEqual([personOne]);
    expect(calls[0]?.href).toBe(
      "https://swapi.dev/api/people/?format=json&search=Luke&page=2",
    );
  });

  it("fetches planet, starship, vehicle, and species by id or url", async () => {
    const calls = stubFetch((url) => {
      if (url.pathname.includes("/planets/")) return jsonResponse({ name: "Tatooine" });
      if (url.pathname.includes("/starships/")) return jsonResponse({ name: "Millennium Falcon" });
      if (url.pathname.includes("/vehicles/")) return jsonResponse({ name: "Sand Crawler" });
      if (url.pathname.includes("/species/")) return jsonResponse({ name: "Wookie" });
      return jsonResponse({ detail: "Not found" }, 404);
    });

    const client = new SwapiClient(config);
    const planet = await client.getPlanet(1);
    const starship = await client.getStarship("https://swapi.dev/api/starships/10/");
    const vehicle = await client.getVehicle(4);
    const species = await client.getSpecies(3);

    expect(planet.name).toBe("Tatooine");
    expect(starship.name).toBe("Millennium Falcon");
    expect(vehicle.name).toBe("Sand Crawler");
    expect(species.name).toBe("Wookie");
    expect(calls.length).toBe(4);
  });

  it("rejects URLs pointing to arbitrary external hosts (SSRF protection)", async () => {
    stubFetch(() => jsonResponse({}));

    const client = new SwapiClient(config);
    await expect(client.getPerson("https://attacker.example/people/1/")).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("origin must match SWAPI base URL"),
    });
  });

  it("rejects mismatched resource URLs and invalid IDs", async () => {
    stubFetch(() => jsonResponse({}));

    const client = new SwapiClient(config);
    await expect(
      client.getPerson("https://swapi.dev/api/planets/1/"),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("path must start with /api/people/"),
    });

    await expect(client.getPerson("invalid-id")).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Invalid people id or URL"),
    });
  });
});
