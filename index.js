var express = require("express")
const fs = require("fs")
var utils = require("./utils")
var app = express()
app.use(express.json())
app.use(express.urlencoded())


if (process.env._ && process.env._.indexOf("heroku") !== -1) {
    var request = require("tor-request")
} else {
    var request = {}
    request.request = require("request")
}
var mime = require("mime")
const { URL } = require("url")

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
		    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.115 Safari/537.36'
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.115 Safari/537.36'
        }
    }
    request.request(options, async (e, r, b) => {
        if(!e && r.statusCode == 200) {
            b = processOpts(req.body, b)
            b = fixAssets(req.body, b, req.headers.host)
            res.send(b).end()
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
    var b = body
    var url = new URL(fdata.url).href
    utils.matchRegex(/src="\/(.+?)"/gmis, b).forEach(element => {
        element = element.replace("src=\"", "").replace("\"", "")
        var newhref = new URL(element, url)
        b = b.replace(element, new URL("https://" + host + "/asset?url=" + encodeURIComponent(newhref.href)))
    });

    utils.matchRegex(/srcset="(.+?)"/ gmis, b).forEach(element => {
        b = b.replace(element, "")
    })

    utils.matchRegex(/<link(.*?) href="(.+?)"(.*?)>/gmis, b).forEach(element => {
        utils.matchRegex(/href="(.+?)"/gmis, element).forEach(ele => {
            ele = ele.replace("href=\"", "").replace("\"", "")
            var newhref = new URL(ele, url)
            b = b.replace(ele, new URL("https://" + host + "/asset?url=" + encodeURIComponent(newhref.href)))
        })
    })

    utils.matchRegex(/<a(.*?) href="(.+?)"(.*?)>/gmis, b).forEach(element => {
        utils.matchRegex(/href="(.+?)"/gmis, element).forEach(ele => {
            ele = ele.replace("href=\"", "").replace("\"", "")
            var newhref = new URL(ele, url)
            b = b.replace(ele, new URL("http://" + host + "/go?url=" + encodeURIComponent(newhref.href)))
        })
    })

    return b
}
