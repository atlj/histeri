import rawConfig from "../../config.json";

interface configType {
  url: string;
  username: string;
  password: string;
}

let config: configType = { ...rawConfig };

export { config };
