var express = require("express")
const fs = require("fs")
var cheerio = require("cheerio")
var utils = require("./utils")
var app = express()
var mime = require("mime")
const { URL } = require("url")
app.use(express.json())
app.use(express.urlencoded())


if ((process.env._ && process.env._.indexOf("heroku") !== -1) || process.env.TOR == true) {
    var request = require("tor-request")
} else {
    var request = {}
    request.request = require("request")
}

app.get("/", async (req, res) => {
    fs.createReadStream("index.html").pipe(res)
})

app.post("/go", async (req, res) => {
    handlePage(req, res)
})
app.get("/go", async (req, res) => {
    req.body = {url: req.query.url, scripts: req.query.scripts, canvas: req.query.canvas, lstorage: req.query.lstorage, title: req.query.title}
    handlePage(req, res)
})

app.get("/asset", async (req, res) => {
	const options = {
        url: req.query.url,
        headers: {
		    'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/8.0; .NET4.0C; .NET4.0E)'
        }
    }
    var mtype = mime.getType(new URL(req.query.url).pathname.split(".")[new URL(req.query.url).pathname.split(".").length - 1])
    res.writeHead(200, {
        "Content-Type": mtype
    })
    request.request(options).on('error', (e) => {res.end("Failed, " + e)}).pipe(res)

})

app.listen(process.env["PORT"] || 3000)


async function handlePage(req, res) {
    const options = {
        url: req.body.url,
        headers: {
          'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/8.0; .NET4.0C; .NET4.0E)'
        }
    }
    request.request(options, async (e, r, b) => {
        if(!e) {
            b = processOpts(req.body, b)
            b = fixAssets(req.body, b, req.headers.host)
            res.writeHead(r.statusCode, {
                'Content-Type': r.headers["Content-Type"] || "text/html"
            }).end(b)
        } else {
           res.send(r.statusCode + ", Looks like it failed.").end()
        }
    })
}


var processOpts = (fdata, body) => {
    var b = body
    const script = new RegExp('<+script(.+?)((<+\\/script>+)|(\\/>))', 'gmis')
    const canvas = new RegExp('<+canvas(.+?)((<+\\/canvas>+)|(\\/>))', 'gmis')
    const title = new RegExp('<+title(.+?)((<+\\/title>+)|(\\/>))', 'gmis')

    if(fdata.scripts) b = b.replace(script, "<!-- Script Omitted by TProx -->")
    if(fdata.canvas) b = b.replace(canvas, "<!-- Canvas Omitted by TProx -->")
    if(fdata.title) b = b.replace(title, "<!-- Title Omitted by TProx -->")
    if(fdata.lstorage) b += `<script>/* Added by TProx */\nsetInterval(()=>{window.localStorage.clear()}, 100)</script>`

    return b
}

var fixAssets = (fdata, body, host) => {
    var $ = cheerio.load(body)
    $("script[src]").each((index, val) => {
        var src = val.attribs.src
        var url = new URL(src, fdata.url)
        val.attribs.src = new URL("http://" + host + "/asset?url=" + encodeURIComponent(url)).href
    })
    $("link[href]").each((index, val) => {
        var src = val.attribs.href
        var url = new URL(src, fdata.url)
        val.attribs.href = new URL("http://" + host + "/asset?url=" + encodeURIComponent(url)).href
    })
    $("a[href]").each((index, val) => {
        var src = val.attribs.href
        var url = new URL(src, fdata.url)
        val.attribs.href = new URL("http://" + host + "/go?url=" + encodeURIComponent(url)).href
    })
    return $.html()
}
