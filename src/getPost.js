const { parse } = require("node-html-parser");
// const puppeteer = require("puppeteer");
// const chrome = require("chrome-aws-lambda");

function parseAttachments(iembHTML) {
  const attachements = iembHTML
    .toString()
    .matchAll(
      /addConfirmedChild\(\'attaches','([^']+)','(\d+)',(true|false),(\d+),(\d+)\)/gm
    );

  const processedAttachements = [];
  for (const attachment of attachements) {
    const [_, fileName, fileType, fileID, boardID, containerType] = [
      ...attachment,
    ];
    const url = `Board/showFile?t=${fileType}&ctype=${containerType}&id=${fileID}&file=${encodeURIComponent(
      fileName
    )}&boardId=${boardID}`;
    processedAttachements.push({
      url,
      fileName,
      fileType,
      fileID,
      boardID,
      containerType,
    });
  }
  return processedAttachements;
}

function parsePostContent(iembHTML) {
  const post = iembHTML.querySelector(
    "div.box#fontBox > div#hyplink-css-style > div"
  );
  return post.innerHTML;
}

function parsePostInfo(iembHTML) {
  const postDetails = iembHTML.querySelectorAll(
    "div.read_message_userinfo_div > div.read_message_usericon > div.left"
  )[1];

  const title = postDetails
    .querySelector(".read_message_username")
    .text.match(/Title : (.*) /)[1];

  // const otherInfo = p.querySelectorAll(".read_message_toname");
  const [senderHTML, receiverHTML, dateHTML] = [
    ...postDetails.querySelectorAll(".read_message_toname"),
  ];

  const sender = senderHTML.text.match(/From : (.*)/)[1];
  const receiver = receiverHTML.text
    .replace(/\n|\r/g, "")
    .replace(/;\s*/, "; ")
    .trim()
    .match(/Target Audience : (.*)/)[1];
  const date = dateHTML.text.trim();

  return {
    title,
    sender,
    receiver,
    date,
  };
}

function parseReply(iembHTML) {
  const replyForm = iembHTML.querySelector("form#replyForm");

  let replyFormSelection = "";
  let replyFormText = "";
  if (!!replyForm) {
    // returns string value of selected radio button or undefined if none selected
    const selectedRadio = replyForm
      .querySelectorAll("input[name=UserRating]")
      .find((input) => input.getAttribute("checked"));
    if (selectedRadio) {
      replyFormSelection = selectedRadio.getAttribute("value");
    }

    replyFormText = replyForm.querySelector("textarea#editArea").text;
  }

  return {
    canReply: !!replyForm,
    selection: replyFormSelection,
    text: replyFormText,
  };
}

export default async function getPostRoute(req, env, ctx) {
  const url = new URL(req.url);
  const veriToken = url.searchParams.get("veriToken");
  const authToken = url.searchParams.get("authToken");
  const sessionID = url.searchParams.get("sessionID");
  const boardID = url.searchParams.get("boardID");
  const pid = url.searchParams.get("pid");

  if (!veriToken || !authToken || !sessionID || !boardID || !pid)
    return new Response("Missing parameters", { status: 400 });

  const response = await fetch(
    `https://iemb.hci.edu.sg/Board/content/${pid}?board=${boardID}&isArchived=False`,
    {
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
    }
  );

  if (response.status != 200)
    return new Response("An error occured while processing your request", {
      status: 500,
    });

  // parse the html
  const iembHTML = parse(await response.text());

  //   check if we are stuck on the sign in page (i.e. needs a token refresh)
  const needsTokenRefresh = iembHTML.querySelector(".login-page");
  if (needsTokenRefresh)
    return new Response("Needs to refresh token", { status: 401 });

  // check if we got sent a `Sorry, an error occurred while processing your request.` instead of the post
  const postExists = iembHTML.querySelector("div.iemb_contents");
  if (!postExists)
    return new Response("An error occured while processing your request", {
      status: 500,
    });

  // ! GET ATTACHMENTS
  const attachments = parseAttachments(iembHTML);

  // ! GET POST CONTENT
  const postContent = parsePostContent(iembHTML);

  // ! GET POST INFO
  const postInfo = parsePostInfo(iembHTML);

  // ! GET POST REPLY DATA
  const postReply = parseReply(iembHTML);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Post successfully fetched",
      post: postContent,
      attachments: attachments,
      postInfo: postInfo,
      postReply: postReply,
    })
  );
}
