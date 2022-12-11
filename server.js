/*********************************************************************************
 *  WEB322 – Assignment 06
 *  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part *  of this assignment has been copied manually or electronically from any other source
 *  (including 3rd party web sites) or distributed to other students.
 *
 *  Name: mohammed abilail ID:144013208 Date: 10 december 2022
 *
 *  Online (Cyclic) Link: https://splendid-yak-onesies.cyclic.app/
 *
 *******************************************************************************/
 var express = require("express");
 var app = express();
 var path = require("path");
 const multer = require("multer");
 const cloudinary = require("cloudinary").v2;
 const streamifier = require("streamifier");
 const upload = multer(); // no { storage: storage }
 const exphbs = require("express-handlebars");
 const stripJs = require("strip-js");
 const authData=require(__dirname +"auth-service.js"); //
 const clientSessions = require('client-sessions');//

 cloudinary.config({
  cloud_name: '144013208',
  api_key: '648259183232712',
  api_secret: 'W56RcbmRTC6csy7K-96z4lRZYUQc',
      secure: true,
  });
 
 app.engine(
   ".hbs",
   exphbs.engine({
     extname: ".hbs",
     defaultLayout: "main",
     helpers: {
       navLink: function (url, options) {
         return (
           "<li" +
           (url == app.locals.activeRoute ? ' class="active" ' : "") +
           '><a href="' +
           url +
           '">' +
           options.fn(this) +
           "</a></li>"
         );
       },
       equal: function (lvalue, rvalue, options) {
         if (arguments.length < 3)
           throw new Error("Handlebars Helper equal needs 2 parameters");
         if (lvalue != rvalue) {
           return options.inverse(this);
         } else {
           return options.fn(this);
         }
       },
       safeHTML: function (context) {
         return stripJs(context);
       },
       formatDate: function (dateObj) {
         let year = dateObj.getFullYear();
         let month = (dateObj.getMonth() + 1).toString();
         let day = dateObj.getDate().toString();
         return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
       },
     },
   })
 );
 app.set("view engine", ".hbs");
 
 //adding path tp product-service.js module to interact with it
 var productSrv = require("./product-service");
 const { get } = require("http");
 
 var HTTP_PORT = process.env.PORT || 8080;
 
 function onHttpStart() {
   console.log("Express http server listening on: " + HTTP_PORT);
   return new Promise(function (res, req) {
     productSrv
       .initialize()
       .then(function (data) {
         console.log(data);
       })
       .catch(function (err) {
         console.log(err);
       });
   });
 }
 
 app.use(function (req, res, next) {
   let route = req.path.substring(1);
   app.locals.activeRoute =
     "/" +
     (isNaN(route.split("/")[1])
       ? route.replace(/\/(?!.*)/, "")
       : route.replace(/\/(.*)/, ""));
   app.locals.viewingCategory = req.query.category;
   next();
 });
 
 app.use(express.static("public"));
 
 ////
 app.use(clientSessions({
   cookieName: "session", // this is the object name that will be added to 'req'
   secret: "w6assignment_web322", // this should be a long un-guessable string.
   duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
   activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
 }));
 
 app.use(function(req, res, next) {
   res.locals.session = req.session;
   next();
   });
 
 function ensureLogin(req, res, next) {
     if (!req.session.user) {
       res.redirect("/login");
     } else {
       next();
     }
   }
   
 //setting up a defualt route for local host
 app.get("/", function (req, res) {
   res.render(path.join(__dirname + "/views/home.hbs"));
 });
 
 app.get("/home", function (req, res) {
   res.render(path.join(__dirname + "/views/home.hbs"));
 });
 
 app.get("/products/add", function (req, res) {
   productSrv
     .getCategories()
     .then((data) => res.render("addProduct", { categories: data }))
     .catch((err) => res.render("addProduct", { categories: [] }));
 });
 
 app.get("/categories/add",ensureLogin , function (req, res) {
   res.render(path.join(__dirname + "/views/addCategory.hbs"));
 });
 
 //add image cloudinary code
 app.post("/products/add", upload.single("featureImage"), function (req, res) {
   let streamUpload = (req) => {
     return new Promise((resolve, reject) => {
       let stream = cloudinary.uploader.upload_stream((error, result) => {
         if (result) {
           resolve(result);
         } else {
           reject(error);
         }
       });
 
       streamifier.createReadStream(req.file.buffer).pipe(stream);
     });
   };
 
   async function upload(req) {
     let result = await streamUpload(req);
     console.log(result);
     return result;
   }
 
   upload(req).then((uploaded) => {
     req.body.featureImage = uploaded.url;
   });
   productSrv.addProduct(req.body).then(() => {
     res.redirect("/demos"); //after done redirect to demos
   });
 });
 
 app.post("/categories/add",ensureLogin , (req, res) => {
   productSrv.addCategory(req.body).then(() => {
     res.redirect("/categories");
   });
 });
 
 app.get("/categories/delete/:id",ensureLogin , (req, res) => {
   productSrv
     .deleteCategoryById(req.params.id)
     .then(res.redirect("/categories"))
     .catch((err) =>
       res.status(500).send("Unable to Remove Category / Category not found")
     );
 });
 
 app.get("/demos/delete/:id",ensureLogin , (req, res) => {
   productSrv
     .deleteProductById(req.params.id)
     .then(res.redirect("/demos"))
     .catch((err) =>
       res.status(500).send("Unable to Remove Product / Product not found")
     );
 });
 
 app.get("/product", async (req, res) => {
   // Declare an object to store properties for the view
   let viewData = {};
 
   try {
     // declare an empty array to hold "product" objects
     let products = [];
 
     // if there's a "category" query, filter the returned products by the category
     if (req.query.category) {
       // Obtain the published "products" by category
       products = await productSrv.getPublishedProductsByCategory(
         req.query.category
       );
     } else {
       // Obtain the published "products"
       products = await productSrv.getPublishedProducts();
     }
 
     // sort the published products by the postDate
     products.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
 
     // get the latest product from the front of the list (element 0)
     let product = products[0];
 
     // store the "products" and "product" data in the viewData object (to be passed to the view)
     viewData.products = products;
     viewData.product = product;
   } catch (err) {
     viewData.message = "no results";
   }
 
   try {
     // Obtain the full list of "categories"
     let categories = await productSrv.getCategories();
 
     // store the "categories" data in the viewData object (to be passed to the view)
     viewData.categories = categories;
   } catch (err) {
     viewData.categoriesMessage = "no results";
   }
 
   // render the "product" view with all of the data (viewData)
   res.render("product", { data: viewData });
 });
 
 //product-id txt
 app.get("/product/:id", async (req, res) => {
   // Declare an object to store properties for the view
   let viewData = {};
 
   try {
     // declare an empty array to hold "product" objects
     let products = [];
 
     // if there's a "category" query, filter the returned products by the category
     if (req.query.category) {
       // Obtain the published "products" by category
       products = await productSrv.getPublishedProductsByCategory(
         req.query.category
       );
     } else {
       // Obtain the published "products"
       products = await productSrv.getPublishedProducts();
     }
 
     // sort the published products by postDate
     products.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
 
     // store the "products" and "product" data in the viewData object (to be passed to the view)
     viewData.products = products;
   } catch (err) {
     viewData.message = "no results";
   }
 
   try {
     // Obtain the product by "id"
     viewData.product = await productSrv.getProductById(req.params.id);
   } catch (err) {
     viewData.message = "no results";
   }
 
   try {
     // Obtain the full list of "categories"
     let categories = await productSrv.getCategories();
 
     // store the "categories" data in the viewData object (to be passed to the view)
     viewData.categories = categories;
   } catch (err) {
     viewData.categoriesMessage = "no results";
   }
 
   // render the "product" view with all of the data (viewData)
   res.render("product", { data: viewData });
 });
 
 //route to products
 app.get("/products", function (req, res) {
   productSrv
     .getPublishedProducts()
     .then(function (data) {
       res.render("product", { product: data });
     })
     .catch(function (err) {
       res.render({ message: err });
     });
 });
 
 app.get("/demos",ensureLogin , (req, res) => {
   if (req.query.category) {
     productSrv
       .getProductByCategory(req.query.category)
       .then((data) => {
         res.render("demos", { products: data });
       })
       .catch((err) => {
         res.render("demos", { message: "no results" });
       });
   } else {
     productSrv
       .getAllProducts()
       .then((data) => {
         res.render("demos", { products: data });
       })
       .catch(function (err) {
         res.render("demos", { message: "no results" });
       });
   }
 });
 //route to categories
 app.get("/categories",ensureLogin , function (req, res) {
   if (req.query.category) {
     productSrv
       .getProductByCategory(req.query.category)
       .then((data) => {
         res.render("categories", { categories: data });
       })
       .catch((err) => {
         res.render("categories", { message: "no results" });
       });
   } else {
     productSrv
       .getCategories()
       .then(function (data) {
         res.render("categories", { categories: data });
       })
       .catch(function (err) {
         res.render("categories", { message: "no results" });
       });
   }
 });
 
 //product id return function
 app.get("/product/:value", function (req, res) {
   productSrv
     .getProductById(req.params.value)
     .then(function (data) {
       res.render(data);
     })
     .catch(function (err) {
       res.render({ message: err });
     });
 });
 
 //login routes
 app.get("/login", (req,res) => {
   res.render(path.join(__dirname + "/views/login.hbs"));
 });
 
 app.get("/register", (req,res) => {
   res.render(path.join(__dirname + "/views/register.hbs"));
 });
 
 app.post("/register", (req,res) => {
   authData.RegisterUser(req.body)
   .then(() => res.render("register", {successMessage: "User created" } ))
   .catch (err => res.render("register", {errorMessage: err, userName:req.body.userName }) )
 });
 
 app.post("/login", (req,res) => {
   req.body.userAgent = req.get('User-Agent');
   authData.checkUser(req.body)
   .then((user) => {
     req.session.user = {
       userName:user.userName,
       email:user.email,
       loginHistory:user.loginHistory // authenticated user's loginHistory
     }
     res.redirect("/demos");
     })
   .catch(err => {
       res.render("login", {errorMessage:err, userName:req.body.userName} )
   }) 
 });
 
 app.get("/logout", (req,res) => {
   req.session.reset();
   res.redirect("/login");
 });
 
 app.get("/userHistory", ensureLogin, (req,res) => {
   res.render("userHistory", {user:req.session.user} );
 });
 
 //if no route found show Page Not Found
 app.use(function (req, res) {
   res.status(404).render(path.join(__dirname, "/views/404.hbs"));
 });
 
 app.use(express.urlencoded({ extended: true }));
 
 productData.initialize() //
 .then(authData.initialize)
 .then(function(){
 app.listen(HTTP_PORT, function(){
 console.log("app listening on: " + HTTP_PORT)
     });
 }).catch(function(err){
 console.log("unable to start server: " + err);
 });
 
 