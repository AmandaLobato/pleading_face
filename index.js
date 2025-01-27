const fastify = require("fastify")();

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

require("dotenv").config();

initializeApp({
  credential: cert(require("./pleadingface-66a7d-e00f9536c168.json"))
});

const db = getFirestore();

const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const DOMAIN = process.env.DOMAIN;

if (JWT_PRIVATE_KEY == undefined) {
  throw Error("JWT_PRIVATE_KEY environment variable not set.");
}

if (DOMAIN == undefined) {
  throw Error("DOMAIN environment variable not set.");
}

fastify.register(require("@fastify/view"), {
  engine: {
    ejs: require("handlebars"),
  },
  root: path.join(__dirname, "views"), // Points to `./views` relative to the current file
  // layout: "./templates/template", // Sets the layout to use to `./views/templates/layout.handlebars` relative to the current file.
  viewExt: "handlebars", // Sets the default extension to `.handlebars`
  propertyName: "render", // The template can now be rendered via `reply.render()` and `fastify.render()`
  defaultContext: {
    dev: process.env.NODE_ENV === "development", // Inside your templates, `dev` will be `true` if the expression evaluates to true
  },
  options: {}, // No options passed to handlebars
});

fastify.register(require('@fastify/formbody'))

fastify.register(require('@fastify/cookie'), {
  secret: "my-secret", // for cookies signature
  hook: 'onRequest', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
  parseOptions: {}  // options for parsing cookies
})


fastify.get("/login", async (req, res) => {
  return res.render("/login/index");
});

fastify.post("/login", async (req, res) => {
  const users = await db.collection("users").where("name", "==", req.body.username).get();
  const user = users.docs[0];

  if (user == undefined) {
    return res.status(404).send("User not found");
  }

  if (await bcrypt.compare(req.body.password.toString(), user.get("pass_hash"))) {
    var token = jwt.sign({
      iss: "pleading_face",
      sub: user.name
    }, JWT_PRIVATE_KEY, {algorithm: 'HS256'});

    res.setCookie("jwt", token, {
      domain: DOMAIN,
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: 2592000,
      sameSite: "strict"
    });

    return res.status(302).redirect("/").send();

  } else {
    return res.status(401).send("Incorrect password");
  }
});

fastify.post("/registrar", async (req, res) => {

});


fastify.listen({port: 3000}).then(() => {
  console.log('Server running at http://localhost:3000/');
});