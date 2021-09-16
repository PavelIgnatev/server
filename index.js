const PORT = 8080;
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");

const xml2js = require("xml2js");

console.log(`localhost:${PORT}`);

async function XMLparse(objJson) {
  let dataObj = [];

  for (i in objJson) {
    for (r in objJson[i]["url"]) {
      let url = objJson[i]["url"][r]["loc"] + "";
      let lastmod = objJson[i]["url"][r]["lastmod"] + "";

      let getData = async (html) => {
        const $ = await cheerio.load(html);

        await $(".t-store__prod-popup__info").each((i, elem) => {
          let settings = [];

          for (
            m = 0;
            m < $(elem).find(".js-store-prod-all-charcs").children().length;
            m++
          ) {
            settings.push(
              $(elem)
                .find(".js-store-prod-all-charcs")
                .children()
                [m].children[0]["data"].match(/:\s+([^\n]+)/)[1]
            );
          }

          dataObj.push({
            title: $(elem).find(".js-store-prod-name").text(),
            price: $(elem).find(".js-product-price").text(),
            link: url,
            lastmod: Date.parse(lastmod),
            imgLink:
              $('meta[itemprop="image"]')[0]["attribs"].content || undefined,
            diameter: settings[0],
            thickness: settings[1],
            steel: settings[2],
            gost: settings[3],
            isWeight: settings[4],
            isFootage: settings[5],
            willWeight: settings[6],
            willFootage: settings[7],
          });
        });

        console.log(r);
      };

      const responseHtml = await axios.get(url);
      await getData(responseHtml.data);
    }
  }

  fs.writeFileSync("json/data.json", JSON.stringify(dataObj, null, 4));
}

async function getObjJson(
  options = {
    host: "waygps.ru",
    path: "/sitemap-store.xml",
  }
) {
  const collect = async (option) => {
    let bodyChunks = [];
    return await new Promise(async (resolve, reject) => {
      http.get(option, function (res) {
        res
          .on("data", function (chunk) {
            bodyChunks.push(chunk);
          })
          .on("end", async function () {
            let body = Buffer.concat(bodyChunks) + "";

            let objJson;

            xml2js.parseString(body, async (err, result) => {
              objJson = JSON.parse(JSON.stringify(result, null, 4));
            });

            resolve(objJson);
          });
      });
    });
  };

  const resultCollect = await collect(options);
  let result = [];

  for (i in resultCollect) {
    if (resultCollect[i]["sitemap"]) {
      for (j of resultCollect[i]["sitemap"]) {
        for (o in j.loc) {
          const url = j["loc"][o].replace("https://", "").split("/");
          const host = url[0];
          const path = "/" + url[1];

          result.push(
            await collect({
              host,
              path,
            })
          );
        }
      }
    } else {
      result.push([resultCollect[i]]);
    }
  }

  return result;
}

(async () => {
  while (true) {
    try {
      await XMLparse(...(await getObjJson()));
    } catch {}
    await new Promise((res, rej) => setTimeout(res, 300000));
  }
})();

http
  .createServer(async (request, response) => {
    if (request.url === "/favicon.ico") {
      response.writeHead(200, { "Content-Type": "image/x-icon" });
      response.end();
      return;
    }

    try {
      response.writeHead(200, {
        "Content-type": "text/html",
        "Access-Control-Allow-Origin": "*",
      });

      response.end(
        JSON.stringify(
          JSON.parse(fs.readFileSync("json/data.json", "utf8")),
          null,
          4
        )
      );
    } catch {}
  })
  .on("uncaughtException", () => {})
  .on("error", () => {})
  .listen(PORT);
