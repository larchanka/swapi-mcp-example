import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwapiClient } from "../api-client.js";
import type { Vehicle } from "../types/swapi.js";
import { registerResourceTools } from "./common.js";

export function registerVehicleTools(
  server: McpServer,
  client: SwapiClient,
): void {
  registerResourceTools<Vehicle>(server, {
    resource: "vehicles",
    getToolName: "get_vehicle",
    searchToolName: "search_vehicles",
    singularTitle: "vehicle",
    pluralTitle: "vehicles",
    searchFieldDescription: "name or model",
    detailsDescription:
      "Returns attributes such as model, vehicle class, manufacturer, cost, length, crew, passengers, max speed, pilots, and films.",
    getByIdOrUrl: (idOrUrl) => client.getVehicle(idOrUrl),
    search: (query, page) => client.searchVehicles(query, page),
  });
}
