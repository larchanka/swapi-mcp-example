import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { loadConfig } from "../src/config.js";
import {
  filmOne,
  filmTwo,
  jsonResponse,
  paginated,
  personOne,
  personTwo,
  planetOne,
  speciesOne,
  starshipOne,
  vehicleOne,
} from "./fixtures.js";

/** Stubs global fetch with a tiny in-memory SWAPI router. */
function stubSwapiApi(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL) => {
      const href = url.href;
      if (href === "https://swapi.dev/api/films/?format=json") {
        return jsonResponse(paginated([filmTwo, filmOne])); // deliberately unsorted
      }
      if (href === "https://swapi.dev/api/films/1/?format=json") {
        return jsonResponse(filmOne);
      }
      if (href === "https://swapi.dev/api/films/2/?format=json") {
        return jsonResponse(filmTwo);
      }
      if (href === "https://swapi.dev/api/people/1/?format=json") {
        return jsonResponse(personOne);
      }
      if (href === "https://swapi.dev/api/people/2/?format=json") {
        return jsonResponse(personTwo);
      }
      if (href.startsWith("https://swapi.dev/api/people/?")) {
        return jsonResponse(paginated([personOne, personTwo]));
      }
      if (href === "https://swapi.dev/api/planets/1/?format=json") {
        return jsonResponse(planetOne);
      }
      if (href.startsWith("https://swapi.dev/api/planets/?")) {
        return jsonResponse(paginated([planetOne]));
      }
      if (href === "https://swapi.dev/api/starships/10/?format=json") {
        return jsonResponse(starshipOne);
      }
      if (href.startsWith("https://swapi.dev/api/starships/?")) {
        return jsonResponse(paginated([starshipOne]));
      }
      if (href === "https://swapi.dev/api/vehicles/4/?format=json") {
        return jsonResponse(vehicleOne);
      }
      if (href.startsWith("https://swapi.dev/api/vehicles/?")) {
        return jsonResponse(paginated([vehicleOne]));
      }
      if (href === "https://swapi.dev/api/species/3/?format=json") {
        return jsonResponse(speciesOne);
      }
      if (href.startsWith("https://swapi.dev/api/species/?")) {
        return jsonResponse(paginated([speciesOne]));
      }
      return jsonResponse({ detail: "Not found" }, 404);
    }),
  );
}

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

async function callTool(
  client: Client,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<ToolResult> {
  return (await client.callTool({ name, arguments: arguments_ })) as ToolResult;
}

async function connectTestClient(): Promise<Client> {
  const server = createServer(loadConfig({}));
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

function parseText(result: ToolResult): unknown {
  const text = result.content.find((part) => part.type === "text")?.text;
  expect(text).toBeDefined();
  return JSON.parse(text as string);
}

function errorText(result: ToolResult): string {
  return result.content.find((part) => part.type === "text")?.text ?? "";
}

beforeEach(() => {
  stubSwapiApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("server tool registration", () => {
  it("registers all SWAPI tools", async () => {
    const client = await connectTestClient();
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toEqual(
      expect.arrayContaining([
        "list_films",
        "get_film",
        "get_film_characters",
        "get_person",
        "search_people",
        "get_planet",
        "search_planets",
        "get_starship",
        "search_starships",
        "get_vehicle",
        "search_vehicles",
        "get_species",
        "search_species",
      ]),
    );
    expect(toolNames.length).toBe(13);
  });
});

describe("list_films tool", () => {
  it("lists all episodes sorted by episode number", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "list_films", {});

    const data = parseText(result) as {
      total_episodes: number;
      episodes: Array<{
        film_id: number;
        episode_id: number;
        title: string;
        release_date: string;
        director: string;
        character_count: number;
      }>;
    };

    expect(data.total_episodes).toBe(2);
    expect(data.episodes.map((e) => e.episode_id)).toEqual([4, 5]);
    expect(data.episodes.map((e) => e.title)).toEqual([
      "A New Hope",
      "The Empire Strikes Back",
    ]);
    expect(data.episodes[0]).toMatchObject({
      film_id: 1,
      release_date: "1977-05-25",
      director: "George Lucas",
      character_count: 2,
    });
  });
});

describe("get_film tool", () => {
  it("returns full film details by film_id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_film", { film_id: 1 });

    const data = parseText(result) as {
      film_id: number;
      title: string;
      episode_id: number;
      opening_crawl: string;
    };

    expect(data.film_id).toBe(1);
    expect(data.title).toBe("A New Hope");
    expect(data.episode_id).toBe(4);
    expect(data.opening_crawl).toContain("civil war");
  });

  it("returns full film details by episode_id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_film", { episode_id: 5 });

    const data = parseText(result) as {
      film_id: number;
      title: string;
      episode_id: number;
    };

    expect(data.film_id).toBe(2);
    expect(data.title).toBe("The Empire Strikes Back");
    expect(data.episode_id).toBe(5);
  });
});

describe("get_film_characters tool", () => {
  it("resolves characters to names when called with film_id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_film_characters", { film_id: 1 });

    const data = parseText(result) as {
      film: { film_id: number; episode_id: number; title: string };
      character_count: number;
      characters: Array<{ id: number; name: string; gender: string; birth_year: string }>;
    };

    expect(data.film).toEqual({ film_id: 1, episode_id: 4, title: "A New Hope" });
    expect(data.character_count).toBe(2);
    expect(data.characters).toEqual([
      expect.objectContaining({ id: 1, name: "Luke Skywalker", gender: "Male" }),
      expect.objectContaining({ id: 2, name: "C-3PO", birth_year: "112 BBY" }),
    ]);
  });

  it("maps episode_id to the correct film", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_film_characters", { episode_id: 5 });

    const data = parseText(result) as {
      film: { film_id: number; episode_id: number; title: string };
      character_count: number;
    };

    expect(data.film).toEqual({
      film_id: 2,
      episode_id: 5,
      title: "The Empire Strikes Back",
    });
    expect(data.character_count).toBe(1);
  });

  it("rejects when neither film_id nor episode_id is provided", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_film_characters", {});

    expect(result.isError).toBe(true);
    expect(errorText(result)).toContain("exactly one of 'film_id' or 'episode_id'");
  });
});

describe("people tools", () => {
  it("gets person by id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_person", { id: 1 });

    const data = parseText(result) as { id: number; name: string; eye_color: string };
    expect(data.id).toBe(1);
    expect(data.name).toBe("Luke Skywalker");
    expect(data.eye_color).toBe("Blue");
  });

  it("searches people", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "search_people", { search: "Luke" });

    const data = parseText(result) as { count: number; results: Array<{ id: number; name: string }> };
    expect(data.count).toBe(2);
    expect(data.results[0]?.name).toBe("Luke Skywalker");
    expect(data.results[0]?.id).toBe(1);
  });
});

describe("planet tools", () => {
  it("gets planet by id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_planet", { id: 1 });

    const data = parseText(result) as { id: number; name: string; climate: string };
    expect(data.id).toBe(1);
    expect(data.name).toBe("Tatooine");
    expect(data.climate).toBe("arid");
  });

  it("searches planets", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "search_planets", { search: "Tatooine" });

    const data = parseText(result) as { count: number; results: Array<{ id: number; name: string }> };
    expect(data.count).toBe(1);
    expect(data.results[0]?.name).toBe("Tatooine");
    expect(data.results[0]?.id).toBe(1);
  });
});

describe("starship tools", () => {
  it("gets starship by id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_starship", { id: 10 });

    const data = parseText(result) as { id: number; name: string; model: string };
    expect(data.id).toBe(10);
    expect(data.name).toBe("Millennium Falcon");
  });

  it("searches starships", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "search_starships", { search: "Falcon" });

    const data = parseText(result) as { count: number; results: Array<{ id: number; name: string }> };
    expect(data.count).toBe(1);
    expect(data.results[0]?.name).toBe("Millennium Falcon");
  });
});

describe("vehicle tools", () => {
  it("gets vehicle by id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_vehicle", { id: 4 });

    const data = parseText(result) as { id: number; name: string; vehicle_class: string };
    expect(data.id).toBe(4);
    expect(data.name).toBe("Sand Crawler");
  });

  it("searches vehicles", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "search_vehicles", { search: "Crawler" });

    const data = parseText(result) as { count: number; results: Array<{ id: number; name: string }> };
    expect(data.count).toBe(1);
    expect(data.results[0]?.name).toBe("Sand Crawler");
  });
});

describe("species tools", () => {
  it("gets species by id", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "get_species", { id: 3 });

    const data = parseText(result) as { id: number; name: string; language: string };
    expect(data.id).toBe(3);
    expect(data.name).toBe("Wookie");
    expect(data.language).toBe("Shyriiwook");
  });

  it("searches species", async () => {
    const client = await connectTestClient();
    const result = await callTool(client, "search_species", { search: "Wookie" });

    const data = parseText(result) as { count: number; results: Array<{ id: number; name: string }> };
    expect(data.count).toBe(1);
    expect(data.results[0]?.name).toBe("Wookie");
  });
});
