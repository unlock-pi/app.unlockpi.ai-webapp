---
name: make better educational ui component blocks
description: How to make components fast without breaking things
---


Before adding more blocks, establish a simple “block contract.” Every new block must answer:
- What does the teacher configure?
eg: 
- What does the student see in presentation mode?
eg: 
- What data is saved?
eg: 
- What AI actions/tools may change it?
eg: 
- Does it need an interaction state or a response model?
eg: 
- Does it have a template/example and a 16:9 presentation check?
eg:

7. Ask which subject this component is from, what the understanding of the students is, and what course or grade the students are in. 

eg usage: 




## tools to use

1. [tsdoc](https://tsdoc.org/) - to basically show how a component should look alike;
[TODO: find out what is tsdoc and write the better description above]
2. motion.dev -> all the animations needs to be made using react-motion using performant methods
[TODO: define and specify what are perfromant methods and approaches]
3. https://cuelume-site.pages.dev - implement sound effects inside the the component
[TODO; when to use which sound effect, and how much vol, define few sound effects as defaults]



## performace

you need to make sure you're using the most performant way to create the 


## aesthetics

colors;
border
shadows

## code
1. Do not over-abstract the code, and write the variable names and function names clearly based on what they do so that it is readable for humans and AI.
2. Finally, the whole code should export back from packages/blocks/source and the name of the block. One single index.ts that is exporting the major component view component. It would be component view, following camel case for variable names and kebab case for file names, keeping the lib files and types subcomponents separately organized. Following the TS doc structure to write comments as well as a description of what the function does while we import it

## Ideal readme 

```md
# block name
quick do 

## image of end product
- Usage guide: what the component end will look like
- Props table: what props are useful and how
- Code architecture: how the code is written, how the data is flowing, what is doing what, and what file names are doing what
This could be a mermaid diagram showing the data flow of that particular component block.
```


## SUMMARY STEPS;
1. Ask series of questions to understand what exactly the developer wants to create
2. understand what libraries/tools to use
3. create ideal readme