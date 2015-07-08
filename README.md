# Runcible #
Runcible is a simple node-based Gist storer and URL shortener, with a URL scheme based on gfycat, focusing on readability and memorability rather than length.

## Usage ##
Runcible is configured for Heroku, and so gets its port data and PostgreSQL configuration information from process.env.PORT and process.env.DATABASE_URL, or 8080 and localhost by default.
Once configured, run

`node index.js`

to launch Runcible.
Username and password configurations are stored in config.js. Currently, it should just contain a module.exports object with a username/password combination:
`module.exports={
	adminUsername: "root"
	, adminPassword:"password" 
}`
The admin page is accessible at /admin/new