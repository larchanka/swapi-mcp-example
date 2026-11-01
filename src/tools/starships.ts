import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwapiClient } from "../api-client.js";
import type { Starship } from "../types/swapi.js";
import { registerResourceTools } from "./common.js";

export function registerStarshipTools(
  server: McpServer,
  client: SwapiClient,
): void {
  registerResourceTools<Starship>(server, {
    resource: "starships",
    getToolName: "get_starship",
    searchToolName: "search_starships",
    singularTitle: "starship",
    pluralTitle: "starships",
    searchFieldDescription: "name or model",
    detailsDescription:
      "Returns attributes such as model, starship class, manufacturer, cost, length, crew, passengers, hyperdrive rating, MGLT, pilots, and films.",
    getByIdOrUrl: (idOrUrl) => client.getStarship(idOrUrl),
    search: (query, page) => client.searchStarships(query, page),
  });
}
