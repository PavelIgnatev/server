const PORT = process.env.PORT || 81;
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");

const xml2js = require("xml2js");

const options = {
  host: "waygps.ru",
  path: "/sitemap-store.xml",
};

console.log(`localhost:${PORT}`);

(async () => {
  while (true) {
    let dataObj = [];
    let bodyChunks = [];
    await new Promise((res, rej) => setTimeout(res, 5000));
    try {
      await new Promise(async (resolve, reject) => {
        http.get(options, async function (res) {
          await res
            .on("data", function (chunk) {
              bodyChunks.push(chunk);
            })
            .on("end", function () {
              let body = Buffer.concat(bodyChunks) + "";

              xml2js.parseString(body, async (err, result) => {
                let objJson = JSON.parse(JSON.stringify(result, null, 4));

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
                          m <
                          $(elem).find(".js-store-prod-all-charcs").children()
                            .length;
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
                            $('meta[itemprop="image"]')[0]["attribs"].content ||
                            undefined,
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

                fs.writeFileSync(
                  "json/data.json",
                  JSON.stringify(dataObj, null, 4)
                );

                resolve();
              });
            });
        });
      });
    } catch {}
  }
})();

http
  .createServer(async (request, response) => {
    if (request.url === "/favicon.ico") {
      response.writeHead(200, { "Content-Type": "image/x-icon" });
      response.end();
      return;
    }

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
    return;
  })
  .listen(PORT);
