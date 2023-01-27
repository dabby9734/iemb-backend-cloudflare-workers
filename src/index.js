import { Router } from "itty-router";
import loginRoute from "./login";
import getPostRoute from "./getPost";
import getBoardRoute from "./getBoard";
import getBoardStarredRoute from "./getBoardStarred";
import getBoardArchivedRoute from "./getBoardArchived";
import downloadRoute from "./download";
import replyRoute from "./reply";
import starRoute from "./star";

const router = Router();
router.get("/login", loginRoute);
router.get("/getPost", getPostRoute);
router.get("/getBoard", getBoardRoute);
router.get("/getBoardStarred", getBoardStarredRoute);
router.get("/getBoardArchived", getBoardArchivedRoute);
router.get("/reply", replyRoute);
router.get("/star", starRoute);
router.post("/download", downloadRoute);

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).
Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all("*", () => new Response("404, not found!", { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    let resp = await router.handle(request);
    // const newResponse = new Response(resp.body, resp);
    resp.headers.append("Access-Control-Allow-Origin", "*");
    return resp;
  },
};
