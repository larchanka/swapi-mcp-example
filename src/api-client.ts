import type { Config } from "./config.js";
import {
  idFromUrl,
  type Film,
  type Paginated,
  type Person,
  type Planet,
  type Species,
  type Starship,
  type Vehicle,
} from "./types/swapi.js";

/** Error thrown for any failed SWAPI HTTP request (non-2xx, network failure, timeout). */
export class ApiError extends Error {
  /** HTTP status code; 0 means the request never completed (network error / timeout). */
  readonly status: number;
  /** SWAPI error detail from the JSON body, when available. */
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Thin HTTP client for the SWAPI REST API.
 * Owns base URL, request timeout, JSON handling and error translation.
 */
export class SwapiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: Config) {
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs;
  }

  /** Returns every film (episode). SWAPI has ~6 films, so pagination is never needed in practice. */
  async listFilms(): Promise<Film[]> {
    const page = await this.request<Paginated<Film>>("films/");
    return page.results;
  }

  async getFilm(filmIdOrUrl: number | string): Promise<Film> {
    return this.getResource<Film>("films", filmIdOrUrl);
  }

  /** Finds a film by its episode number (1-6), since film resource ids do not match episode ids. */
  async findFilmByEpisode(episodeId: number): Promise<Film | undefined> {
    const films = await this.listFilms();
    return films.find((film) => film.episode_id === episodeId);
  }

  /** Fetches a person by id or by their absolute SWAPI URL. */
  async getPerson(idOrUrl: number | string): Promise<Person> {
    return this.getResource<Person>("people", idOrUrl);
  }

  /** Searches people by name or returns paginated list of characters. */
  async searchPeople(search?: string, page?: number): Promise<Paginated<Person>> {
    return this.searchResource<Person>("people", search, page);
  }

  /** Fetches a planet by id or by its absolute SWAPI URL. */
  async getPlanet(idOrUrl: number | string): Promise<Planet> {
    return this.getResource<Planet>("planets", idOrUrl);
  }

  /** Searches planets by name or returns paginated list of planets. */
  async searchPlanets(search?: string, page?: number): Promise<Paginated<Planet>> {
    return this.searchResource<Planet>("planets", search, page);
  }

  /** Fetches a starship by id or by its absolute SWAPI URL. */
  async getStarship(idOrUrl: number | string): Promise<Starship> {
    return this.getResource<Starship>("starships", idOrUrl);
  }

  /** Searches starships by name or model, or returns paginated list of starships. */
  async searchStarships(search?: string, page?: number): Promise<Paginated<Starship>> {
    return this.searchResource<Starship>("starships", search, page);
  }

  /** Fetches a vehicle by id or by its absolute SWAPI URL. */
  async getVehicle(idOrUrl: number | string): Promise<Vehicle> {
    return this.getResource<Vehicle>("vehicles", idOrUrl);
  }

  /** Searches vehicles by name or model, or returns paginated list of vehicles. */
  async searchVehicles(search?: string, page?: number): Promise<Paginated<Vehicle>> {
    return this.searchResource<Vehicle>("vehicles", search, page);
  }

  /** Fetches a species by id or by its absolute SWAPI URL. */
  async getSpecies(idOrUrl: number | string): Promise<Species> {
    return this.getResource<Species>("species", idOrUrl);
  }

  /** Searches species by name or returns paginated list of species. */
  async searchSpecies(search?: string, page?: number): Promise<Paginated<Species>> {
    return this.searchResource<Species>("species", search, page);
  }

  /** Fetches a single resource by its numeric id or absolute URL. */
  async getResource<T>(resource: string, idOrUrl: number | string): Promise<T> {
    const raw = String(idOrUrl).trim();
    let urlId: number | undefined;

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      let parsed: URL;
      try {
        parsed = new URL(raw);
      } catch {
        throw new ApiError(400, `Invalid ${resource} URL: ${idOrUrl}`);
      }

      const baseUrlParsed = new URL(this.baseUrl);
      if (parsed.origin !== baseUrlParsed.origin) {
        throw new ApiError(
          400,
          `Invalid ${resource} URL: origin must match SWAPI base URL (${baseUrlParsed.origin})`,
        );
      }

      const basePath = baseUrlParsed.pathname.replace(/\/+$/, "");
      const expectedPrefix = `${basePath}/${resource}/`;
      if (!parsed.pathname.startsWith(expectedPrefix)) {
        throw new ApiError(
          400,
          `Invalid ${resource} URL: path must start with ${expectedPrefix}`,
        );
      }

      urlId = idFromUrl(raw, resource);
    } else {
      const cleanId = raw.replace(/^\/+|\/+$/g, "");
      const parsedNum = Number(cleanId);
      if (cleanId !== "" && !Number.isNaN(parsedNum) && Number.isInteger(parsedNum) && parsedNum > 0) {
        urlId = parsedNum;
      }
    }

    if (urlId === undefined) {
      throw new ApiError(400, `Invalid ${resource} id or URL: ${idOrUrl}`);
    }

    return this.request<T>(`${resource}/${urlId}/`);
  }

  /** Queries a resource collection with optional search and pagination parameters. */
  async searchResource<T>(
    resource: string,
    search?: string,
    page?: number,
  ): Promise<Paginated<T>> {
    const params: Record<string, string | number | undefined> = {};
    if (search !== undefined && search.trim() !== "") {
      params.search = search.trim();
    }
    if (page !== undefined) {
      params.page = page;
    }
    return this.request<Paginated<T>>(`${resource}/`, params);
  }

  private async request<T>(
    pathOrUrl: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(pathOrUrl, this.baseUrl);
    url.searchParams.set("format", "json");
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ApiError(0, describeTransportError(error, this.timeoutMs));
    }

    if (!response.ok) {
      const detail = await extractDetail(response);
      throw new ApiError(
        response.status,
        `SWAPI request failed: HTTP ${response.status}${detail ? `. ${detail}` : ""}`,
        detail,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(response.status, "SWAPI returned a non-JSON response");
    }
  }
}

function describeTransportError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return `SWAPI request timed out after ${timeoutMs}ms`;
  }
  const reason = error instanceof Error ? error.message : String(error);
  return `SWAPI request failed before getting a response: ${reason}`;
}

async function extractDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // Non-JSON error body — no detail available.
  }
  return undefined;
}
