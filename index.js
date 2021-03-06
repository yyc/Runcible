var express=require("express");
var sequelize=require("sequelize");
var qs=require("querystring");
var fs=require("fs");
var Sequelize = require("sequelize");
var cors=require("cors");

var configs=require("./config.js");
var app=express();
var animals;
var adjectives;
fs.readFile(__dirname+"/collateral/adjectives","utf8",function(err,data){
  if(err){
    console.log(err);
  }else{
    data=data.trim();
    var array=data.split("\n");
    adjectives=array.map(function(txt){
      return txt.substr(0,1).toUpperCase()+txt.substr(1);
    });
  }
});
fs.readFile(__dirname+"/collateral/animals","utf8",function(err,data){
  if(err){
    console.log(err);
  }else{
    data=data.trim();
    var array=data.split("\n");
    animals=array.map(function(txt){
      return txt.substr(0,1).toUpperCase()+txt.substr(1);
    });
  }
});

app.use(cors({
  origin: "*"
}))

if(process.env.DATABASE_URL){
  var sequelize=new Sequelize(process.env.DATABASE_URL);
}
else{
  var sequelize=new Sequelize("runcible","","",{
    dialect: "postgres"
    , host: "localhost"
    , pool: {
        max: 2
      , min: 0
      , idle: 10000
    }
  });
}

var Resource = sequelize.define("resource",{
  name: {
    type: Sequelize.STRING
    , field: "name"
  }
  , url: {
    type: Sequelize.STRING
    , field: "url"
  }
  , gist: {
    type: Sequelize.TEXT
    , field: "gist"
  }
  , mimeType: {
    type: Sequelize.STRING
    , field: "mime_type"
  }
});
sequelize.sync();
  
app.route("/").get(function(req,res,next){
  res.redirect("/runcible");
})
app.route("/admin").post(readPost).post(checkAuth).post(function(req,res,next){
    /*
      req.json
    { name: 'asd',
      gist: 'asdasd',
      mimeType: 'text/plain',
      password: 'asd' }  
    */
    if(req.json.name&&(req.json.gist||req.json.url)){
      res.json.name=res.json.name.toLowerCase();
      Resource.findOrCreate({where: {name: req.json.name}, defaults:req.json})
      .spread(function(resource,created){
        if(created){
					if(req.json.url){
						res.end("URL created at "+req.headers.host+'/'+req.json.name);
          }
          else{
						res.redirect("/"+req.json.name);
					}
        }
        else{
          res.status(422);
          res.statusMessage="Resource already exists";
          res.end("422 Resource Already Exists. Use UPDATE");
        }
      });
    } else{
      res.status(400);
      res.end("400 Bad Request");
    }
  });
app.route("/admin/new").get(function(req,res,next){
    res.sendFile(__dirname+"/collateral/admin.html");
  })
app.route("/admin/:password/:command").get(function(req,res,next){
  if(req.params.password==configs.adminPassword){
    switch(req.params.command){
      case "flushdb":
        sequelize.sync({force:true}).then(function(result){
          console.log(result);
          res.end("Database Flushed");
        })
      break;
      case "list":
        Resource.findAll().then(function(resources){
          console.log(resources);
          if(resources.length){
            res.write("<table><tr><th>Name</th><th>Type</th>");
            resources.forEach(function(resource){
              res.write("<tr><td><a href='/"+resource.name+"'>"+resource.name+"</a></td><td>");
              if(resource.url){
                res.write("URL");
              }
              else{
                res.write("Gist");
              }
              res.write("</td></tr>\n");
            });
            res.end("</table>");
          }
          else{
            res.end("Empty");
          }
        });
      break;
      default :
      
      res.end();
    }
  }
  else{
    res.status(404);
    res.type("html");
    res.end("Cannot "+req.method+" "+req.path);
  }
})


app.route("/jquery.js").get(function(req,res,next){
  res.sendFile(__dirname+"/collateral/jquery-2.1.4.min.js");
});
app.route("/getPhrase").get(genPhrase);
app.route("/:name").all(function(req,res,next){
  Resource.findOne({where : {name : {$iLike:req.params.name}}}).then(function(resource){
    if(resource==null){
      res.status(404);
      res.type("html");
      res.end("Resource not Found");
    }
    else{
      if(resource.url){
        res.redirect(resource.url);
      }
      else if(resource.gist){
        if(resource.mimeType){
          res.type(resource.mimeType);
        }
        else{
          res.type("text/plain");
        }
        res.end(resource.gist);
      }
    }
  },function(error){
    res.status(500);
    res.end("500 Internal Server Error");
  })
});

app.route("/:project/:keyword").all(function(req,res,next){
  
});

function readPost(req,res,next){
  var postString="";
  req.on("data",function(data){
    postString+=data;
  }).on("end",function(data){
    req.text=postString;
    console.log(postString);
    try{
      req.json=JSON.parse(postString)
    }
    catch(err){
      req.json=qs.parse(postString);
    }
    finally{
      next();      
    }
  });
}
function genPhrase(req,res,next){
    var phrase;
    phrase=adjectives[Math.floor(Math.random()*adjectives.length)]+adjectives[Math.floor(Math.random()*adjectives.length)]+animals[Math.floor(Math.random()*animals.length)];
    Resource.count({where: ["name = ?", phrase]}).then(function(count){
      if(count==0){
        res.end(phrase);
      }
      else{
        genPhrase(req,res,next);
      }
    })
}
function genWord(req,res,next){
  
}
function checkAuth(req,res,next){
  if(req.json.password==configs.adminPassword){
    next();
  }
  else{
    res.statusCode=403;
    res.end("Incorrect Password");
  }
}
app.listen(process.env.PORT || 8080,function(){
  console.log("Listening on port",process.env.PORT || 8080);
});