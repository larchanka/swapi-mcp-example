import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwapiClient } from "../api-client.js";
import type { Person } from "../types/swapi.js";
import { registerResourceTools } from "./common.js";

export function registerPeopleTools(
  server: McpServer,
  client: SwapiClient,
): void {
  registerResourceTools<Person>(server, {
    resource: "people",
    getToolName: "get_person",
    searchToolName: "search_people",
    singularTitle: "character",
    pluralTitle: "characters",
    detailsDescription:
      "Returns attributes such as name, height, mass, hair/skin/eye colors, birth year, gender, homeworld, films, species, vehicles, and starships.",
    getByIdOrUrl: (idOrUrl) => client.getPerson(idOrUrl),
    search: (query, page) => client.searchPeople(query, page),
  });
}
