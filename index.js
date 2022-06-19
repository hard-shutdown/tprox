var express = require("express")
var app = express()
app.use(express.json())
app.use(express.urlencoded())

var request = require("request")
const { URL } = require("url")

app.get("/", async (req, res) => {
    res.end(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>tprox</title>
            </head>
            <body>
				<h1>TProx</h1>
                <form action="/go" method="POST">
                    <label for="furl">URL:</label><br>
                    <input type="text" id="furl" name="url" value="https://www.google.com/"><br><br>
                    <input type="checkbox" id="fscripts" name="scripts" value="true">
                    <label for="fscripts"> Remove Scripts</label><br>
                    <input type="checkbox" id="fcanvas" name="canvas" value="true">
                    <label for="fcanvas"> Remove Canvases</label><br>
					<input type="checkbox" id="ftitle" name="title" value="true">
                    <label for="ftitle"> Remove Page Title</label><br>
                    <input type="checkbox" id="flocalstorage" name="lstorage" value="true">
                    <label for="flocalstorage"> Remove LocalStorage</label>
                    <br><br><input type="submit" value="Submit">
                </form>
            </body>
        </html>
    `)
})

app.post("/go", async (req, res) => {
    handlePage(req, res)
})
app.get("/go", async (req, res) => {
    req.body = {url: req.query.url, scripts: req.query.scripts, canvas: req.query.canvas, lstorage: req.query.lstorage}
    handlePage(req, res)
})

app.listen(process.env["PORT"] || 3000)


async function handlePage(req, res) {
    const options = {
        url: req.body.url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.115 Safari/537.36'
        }
    };
    request(options, async (e, r, b) => {
        if(!e && r.statusCode == 200) {
            b = processOpts(req.body, b)
            b = fixAssets(req.body, b)
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

var fixAssets = (fdata, body) => {
    var b = body
    var regex = /src="\/(.+?)"/gmis
    var arr = b.match(regex) || [""]
    var url = new URL(fdata.url).href

    arr.forEach(element => {
        element = element.replace("src=\"", "").replace("\"", "")
        var newhref = new URL(element, url)
        b = b.replace(element, newhref.href)
    });
    return b
}