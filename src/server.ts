import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SwapiClient } from "./api-client.js";
import { loadConfig, type Config } from "./config.js";
import { registerFilmTools } from "./tools/films.js";
import { registerPeopleTools } from "./tools/people.js";
import { registerPlanetTools } from "./tools/planets.js";
import { registerSpeciesTools } from "./tools/species.js";
import { registerStarshipTools } from "./tools/starships.js";
import { registerVehicleTools } from "./tools/vehicles.js";

export const SERVER_NAME = "swapi-mcp";
export const SERVER_VERSION = "1.0.0";

export function createServer(config: Config = loadConfig()): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const client = new SwapiClient(config);
  registerFilmTools(server, client);
  registerPeopleTools(server, client);
  registerPlanetTools(server, client);
  registerStarshipTools(server, client);
  registerVehicleTools(server, client);
  registerSpeciesTools(server, client);
  return server;
}
