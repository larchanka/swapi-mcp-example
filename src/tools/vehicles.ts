import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SwapiClient } from "../api-client.js";
import {
  enrichWithId,
  formatPaginatedResult,
  jsonResult,
  toErrorResult,
} from "./common.js";

export function registerVehicleTools(
  server: McpServer,
  client: SwapiClient,
): void {
  server.registerTool(
    "get_vehicle",
    {
      title: "Get Star Wars vehicle details",
      description:
        "Get detailed information about a specific Star Wars vehicle by ID or URL. " +
        "Returns attributes such as model, vehicle class, manufacturer, cost, length, crew, " +
        "passengers, max speed, pilots, and films.",
      inputSchema: {
        id: z
          .union([z.number().int().positive(), z.string()])
          .describe(
            "Vehicle resource ID (e.g. 4 for Sand Crawler) or full SWAPI vehicle URL",
          ),
      },
    },
    async ({ id }) => {
      try {
        const vehicle = await client.getVehicle(id);
        return jsonResult(enrichWithId(vehicle, "vehicles"));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "search_vehicles",
    {
      title: "Search or list Star Wars vehicles",
      description:
        "Search Star Wars vehicles by name or model, or list vehicles page-by-page. " +
        "SWAPI returns up to 10 results per page.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe(
            "Search query to filter vehicles by name or model (case-insensitive substring). Leave empty to list all.",
          ),
        page: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Page number for pagination (defaults to 1)."),
      },
    },
    async ({ search, page }) => {
      try {
        const result = await client.searchVehicles(search, page);
        return jsonResult(formatPaginatedResult(result, "vehicles"));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
