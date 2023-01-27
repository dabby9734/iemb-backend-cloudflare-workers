const { parse } = require("node-html-parser");
export default async function getBoardRoute(req, env, ctx) {
  const url = new URL(req.url);
  const veriToken = url.searchParams.get("veriToken");
  const authToken = url.searchParams.get("authToken");
  const sessionID = url.searchParams.get("sessionID");
  const boardID = url.searchParams.get("boardID");
  const type = url.searchParams.get("t");
  const postBy = url.searchParams.get("postBy");

  if (!veriToken || !authToken || !sessionID || !boardID)
    return new Response("Missing parameters", { status: 400 });

  let path = `/Board/Detail/${boardID}`;
  switch (type) {
    case "1": // updated messages
      path += `?isupdated=True&t=1`;
      break;
    case "2": // my messages
      path += `?postBy=${postBy}&t=2`;
      break;
    case "3": // my drafts
      path = `/Board/Draft/${boardID}`;
      break;
  }

  const response = await fetch(`https://iemb.hci.edu.sg/${path}`, {
    method: "GET",
    headers: {
      host: "iemb.hci.edu.sg",
      referer: "https://iemb.hci.edu.sg/",
      origin: "https://iemb.hci.edu.sg",
      "content-type": "application/x-www-form-urlencoded",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Mobile Safari/537.36",
      cookie: `__RequestVerificationToken=${veriToken};.Mozilla%2f4.0+(compatible%3b+MSIE+6.1%3b+Windows+XP);ASP.NET_SessionId=${sessionID}; AuthenticationToken=${authToken};`,
    },
  });

  if (response.status != 200)
    return new Response("An error occured while processing your request", {
      status: 500,
    });

  // parse the html
  const iembHTML = parse(await response.text());

  // check if we are stuck on the sign in page (i.e. needs a token refresh)
  const needsTokenRefresh = iembHTML.querySelector(".login-page");
  if (needsTokenRefresh)
    return new Response("Needs to refresh token", { status: 401 });

  const messageSections = iembHTML.querySelectorAll("table.tablesorter");

  const [unreadMessages, readMessages] = messageSections.map((section) => {
    return section.querySelectorAll("tbody > tr");
  });

  const messages = [];
  const getAttribute = (element, attribute, defaultValue) => {
    let result = defaultValue;
    try {
      return element[attribute];
    } catch (e) {
      return result;
    }
  };

  if (
    typeof unreadMessages !== "undefined" &&
    unreadMessages[0].querySelector("td > b")?.text.toString().trim() !==
      "No Record Found!"
  ) {
    unreadMessages.forEach((message) => {
      const data = message.querySelectorAll("td");

      messages.push({
        date: data[0].text.replace(/\s+/g, ""),
        sender: data[1].querySelector("a").getAttribute("tooltip-data"),
        username: data[1].querySelector("a").text.trim(),
        subject: data[2].querySelector("a").text,
        url: data[2].querySelector("a").getAttribute("href"),
        boardID: parseInt(boardID),
        pid: parseInt(
          data[2]
            .querySelector("a")
            .getAttribute("href")
            .match(/\/Board\/content\/(\d+)/)[1]
        ),
        urgency: data[3].querySelector("img").getAttribute("alt"),
        recipient: data[4].text.trim(),
        viewCount: parseInt(
          getAttribute(data[5].text.match(/Viewer:\s+(\d+)/), 1, 0)
        ),
        replyCount: parseInt(
          getAttribute(data[5].text.match(/Response:\s+(\d+)/), 1, 0)
        ),
        read: false,
      });
    });
  }

  if (
    typeof readMessages !== "undefined" &&
    readMessages[0].querySelector("td > b")?.text.toString().trim() !==
      "No Record Found!"
  ) {
    readMessages.forEach((message) => {
      const data = message.querySelectorAll("td");

      messages.push({
        date: data[0].text.replace(/\s+/g, ""),
        sender: data[1].querySelector("a").getAttribute("tooltip-data"),
        username: data[1].querySelector("a").text.trim(),
        subject: data[2].querySelector("a").text,
        url: data[2].querySelector("a").getAttribute("href"),
        boardID: parseInt(boardID),
        pid: parseInt(
          data[2]
            .querySelector("a")
            .getAttribute("href")
            .match(/\/Board\/content\/(\d+)/)[1]
        ),
        urgency: data[3].querySelector("img").getAttribute("alt"),
        recipient: data[4].text.trim(),
        viewCount: parseInt(
          getAttribute(data[5].text.match(/Viewer:\s+(\d+)/), 1, 0)
        ),
        replyCount: parseInt(
          getAttribute(data[5].text.match(/Response:\s+(\d+)/), 1, 0)
        ),
        read: true,
      });
    });
  }

  const name = iembHTML
    .querySelector("div.iemb_user_name")
    .text.match(/Welcome (.*)/)[1]
    .trim();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Fetched messages!",
      messages,
      name,
    }),
    { status: 200 }
  );
}
