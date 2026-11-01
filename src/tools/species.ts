import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwapiClient } from "../api-client.js";
import type { Species } from "../types/swapi.js";
import { registerResourceTools } from "./common.js";

export function registerSpeciesTools(
  server: McpServer,
  client: SwapiClient,
): void {
  registerResourceTools<Species>(server, {
    resource: "species",
    getToolName: "get_species",
    searchToolName: "search_species",
    singularTitle: "species",
    pluralTitle: "species",
    detailsDescription:
      "Returns attributes such as classification, designation, average height, average lifespan, skin/hair/eye colors, language, homeworld, people, and films.",
    getByIdOrUrl: (idOrUrl) => client.getSpecies(idOrUrl),
    search: (query, page) => client.searchSpecies(query, page),
  });
}
