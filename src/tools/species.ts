import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SwapiClient } from "../api-client.js";
import {
  enrichWithId,
  formatPaginatedResult,
  jsonResult,
  toErrorResult,
} from "./common.js";

export function registerSpeciesTools(
  server: McpServer,
  client: SwapiClient,
): void {
  server.registerTool(
    "get_species",
    {
      title: "Get Star Wars species details",
      description:
        "Get detailed information about a specific Star Wars species by ID or URL. " +
        "Returns attributes such as classification, designation, average height, average lifespan, " +
        "skin/hair/eye colors, language, homeworld, people, and films.",
      inputSchema: {
        id: z
          .union([z.number().int().positive(), z.string()])
          .describe(
            "Species resource ID (e.g. 1 for Human, 3 for Wookiee) or full SWAPI species URL",
          ),
      },
    },
    async ({ id }) => {
      try {
        const item = await client.getSpecies(id);
        return jsonResult(enrichWithId(item, "species"));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "search_species",
    {
      title: "Search or list Star Wars species",
      description:
        "Search Star Wars species by name, or list species page-by-page. " +
        "SWAPI returns up to 10 results per page.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe(
            "Search query to filter species by name (case-insensitive substring). Leave empty to list all.",
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
        const result = await client.searchSpecies(search, page);
        return jsonResult(formatPaginatedResult(result, "species"));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
