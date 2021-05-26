import { Engine } from "./classes/browser";
(async () => {
  const engine: Engine = await new Engine().build();
  await engine.login();
  await engine.listLessons();
})();
