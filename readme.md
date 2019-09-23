Hello. I'm Core.js, MVC boilerplate for getting an express app and api up and going fast.

This is a work in progress. Right now, the library is included as a git submodule into any existing express project. Future plans are to modify this to be a cli tool that 

1. Generates a new project
2. Updates an existing project
3. Generates User,Session,Token,Config tables (if desired)

The goal of "Core" isn't to be a long term dependency, like a npm module, but rather an upgradable framework that takes care of the heavy lifting behind creating a api / app. 

Another goal of this project is to not become so bloated you can't wrap your head around it without a book. 

TODO

1. Query Generator for MSSQL (done)
2. Query Generator for Elastic Search
3. Move form layouts into a table rather than config files (done)
4. Create a gui for managing tables layouts (done)
5. Revamp JS for ADMIN
6. Move to Template Literals
