import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwapiClient } from "../api-client.js";
import type { Planet } from "../types/swapi.js";
import { registerResourceTools } from "./common.js";

export function registerPlanetTools(
  server: McpServer,
  client: SwapiClient,
): void {
  registerResourceTools<Planet>(server, {
    resource: "planets",
    getToolName: "get_planet",
    searchToolName: "search_planets",
    singularTitle: "planet",
    pluralTitle: "planets",
    detailsDescription:
      "Returns attributes such as climate, terrain, population, gravity, orbital period, residents, and films.",
    getByIdOrUrl: (idOrUrl) => client.getPlanet(idOrUrl),
    search: (query, page) => client.searchPlanets(query, page),
  });
}
