const ENUM = {
        RECTANGLE: 0,
        OVAL: 1
}
class Shape {
        type = ENUM.RECTANGLE;
        w = 10;
        h = 10;
        x = 0;
        y = 0;
        constructor(type=ENUM.RECTANGLE,x=0,y=0,w=50,h=50) {
                this.name = type==ENUM.RECTANGLE?"MyRect":"MyOval";
                this.type = type;
                this.x = x;
                this.y = y;
                this.w = w;
                this.h = h;
        }
}

class Object_ {
        shapes = []; // : Shape
        x = 0;
        y = 0;
        visible = true;
        constructor(shapes=[],x=0,y=0) {
                this.shapes = shapes;
                this.x = x;
                this.y = y;
        }
}
class ObjectSequence {
        frames = [new Object_(new Shape(),0,0)]; // : Object
        state = 0;
        x = 0;
        y = 0;
        constructor(frames=[],x=0,y=0) {
                this.frames = frames;
                this.x = x;
                this.y = y;
        }
}

class Renderer {
        canvas = undefined;  // : DOM Canvas
        frames = []; // : [{String: Object|ObjectSequence}]

        constructor(canvas) {
                this.canvas = canvas;
                console.log(this.canvas)
                this.frames = [{}];
        }
        render(frame=0) {
                let objects = this.frames[frame];

                const ctx = this.canvas.getContext("2d");
                ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

                const drawShape = (shape,objX,objY) => {
                        let path = new Path2D;
                        let func = {0:(x,y,w,h)=>path.rect(x,y,w,h),1:(x,y,w,h)=>{path.ellipse(x+w/2,y+h/2,w/2,h/2,0,-360,360);path.closePath()}}
                        let shapeX = objX + shape.x;
                        let shapeY = objY + shape.y;
                        func[shape.type](shapeX,shapeY,shape.w,shape.h);
                        ctx.fill(path);
                }
                const drawObject = (object,offsetX=0,offsetY=0) => {
                        if (object.visible == false) return;
                        if (!object.shapes) {
                                drawObject(object.frames[object.state],object.x,object.y);
                                return;
                        }
                        let objW = 0;
                        let objH = 0;
                        for (let shape of object.shapes) {
                                objW = Math.max(shape.w,objW,shape.x);
                                objH = Math.max(shape.h,objH,shape.y);
                        }
                        let objX = (object.x + ((this.canvas.width/2)-(objW/2)))+offsetX;
                        let objY = (object.y + ((this.canvas.height/2)-(objH/2)))+offsetY;

                        for (let shape of object.shapes) {
                                drawShape(shape,objX,objY);
                        }
                }

                for (let key in objects) {
                        const object = objects[key];
                        drawObject(object);
                }
        }

        newObject(
                shapes = [
                        new Shape(
                                0,
                                0,
                                0,
                                50,
                                50
                        )
                ],
                x = 0,
                y = 0
        ) {
                return new Object_(
                        shapes,
                        x,
                        y
                );
        }
        addObject(name = (typeof(object)==="Object"?"myObject":"mySequence"),object,frame=0) {
                this.frames[frame][name] = object;
        }
        newSequence(
                frames = [
                        new Object_(
                                ENUM.RECTANGLE,
                                0,
                                0,
                                50,
                                50
                        )
                ],
                x = 0,
                y = 0
        ) {
                return new ObjectSequence(
                        frames,
                        0,
                        x,
                        y
                );
        }
}
class Interface {
        renderer = undefined;
        clipboard = {};
        objectClipboard = {};
        shapeClipboard = {};
        frame = 0;

        constructor(renderer) {
                this.renderer = renderer;
        }
        render() {
                this.renderer.render(this.frame);
        }
        createNewFrame(objects={}) {
                this.renderer.frames.push(objects);
                this.frame = this.renderer.frames.length-1;
                this.render()
                if (!JANITOR) console.log("Created new frame!");
        }
        copyFrame() {
                this.clipboard = this.renderer.frames[this.frame];
                if (!JANITOR) console.log("Copied frame!");
        }
        pasteFrame() {
                this.renderer.frames[this.frame] = structuredClone(this.clipboard);
                this.render()
                if (!JANITOR) console.log("Pasted new frame!");
        }
        deleteFrame() {
                this.renderer.frames.splice(this.frame,1);
                if (this.frame > this.renderer.frames.length-1) this.frame--;
                this.render()
                if (!JANITOR) console.log("Deleted frame!");
        }
        cutFrame() {
                this.copyFrame();
                this.deleteFrame();
        }
        newObject(
                name = "MyObject",
                shapes = [
                        new Shape(
                                0,
                                0,
                                0,
                                50,
                                50
                        )
                ],
                x = 0,
                y = 0
        ) {
                let newObj = this.renderer.newObject(shapes,x,y);
                this.renderer.addObject(name,newObj,this.frame);
                this.render();
        }
}
class GUI {
        interface = undefined;
        selectedObject = "";
        selectedShape = -1;
        objectsSection = undefined; // DOM div
        functionsSection = []; // [DOM div]
        shapesSection = undefined; // DOM div
        currentFrameText = undefined; // DOM p|DOM span
        selectedObjectText = undefined; // DOM p|DOM span
        speed = 0.2;
        playing = false;
        interval = 0;
        constructor(interface_) {
                this.interface = interface_;
        }
        updateObjects() {
                let deselect = document.createElement("button");
                deselect.textContent = "Deselect";
                deselect.addEventListener("click",()=>{
                        this.selectedObject = "";
                        this.selectedShape = -1;
                        this.updateObjects();
                        this.updateObjectSelectionText();
                });
                let deselectShape = document.createElement("button");
                deselectShape.textContent = "Deselect";
                deselectShape.addEventListener("click",()=>{
                        this.selectedShape = -1;
                        this.updateObjectSelectionText();
                });
                this.objectsSection.innerHTML = '';
                this.shapesSection.innerHTML = '';
                this.shapesSection.style.display = "none";
                this.objectsSection.style.display = "none";
                this.objectsSection.appendChild(deselect);
                this.shapesSection.appendChild(deselectShape);

                const sel = this.interface.frame;
                const frame = this.interface.renderer.frames[sel];

                if (Object.keys(frame).length<1) return;
                this.objectsSection.style.display = "flex";
                for (let objectName in frame) {
                        const btn = document.createElement("button");
                        btn.textContent = objectName;
                        btn.addEventListener("click",()=>{
                                this.selectedObject = btn.textContent;
                                this.updateObjectSelectionText();
                                this.updateObjects();
                        });
                        this.objectsSection.appendChild(btn)
                }

                if (this.selectedObject === "") return;

                const obj = frame[this.selectedObject]
                let shapes = obj.shapes
                if (!obj.shapes) {
                        shapes = obj.frames[obj.state].shapes
                };
                this.shapesSection.style.display = "flex";
                let i = 0;
                for (let shape of shapes) {
                        const btn = document.createElement("button");
                        btn.textContent = shape.name + `(${i})`;
                        let copy = i;
                        btn.addEventListener("click",()=>{
                                this.selectedShape = copy;
                                this.updateObjectSelectionText();
                        })
                        this.shapesSection.appendChild(btn);
                        i++;
                }
        }
        render() {
                this.interface.render();
                this.currentFrameText.textContent = "Frame " + this.interface.frame;
                this.updateObjects();
        }
        newObject(
                name = "MyObject",
                shapes = [
                        new Shape(
                                0,
                                0,
                                0,
                                50,
                                50
                        )
                ],
                x = 0,
                y = 0
        ) {
                const sel = this.interface.frame;
                const frame = this.interface.renderer.frames[sel];
                while (frame[name]) {name += "Copy"}
                this.interface.newObject(name,shapes,x,y);
                this.updateObjects();
        }
        removeSelected() {
                const interfaceFrame = this.interface.frame;
                const frames = this.interface.renderer.frames;

                delete frames[interfaceFrame][this.selectedObject];
                this.selectedObject = "";
                this.updateObjectSelectionText();

                this.interface.render();
                this.updateObjects();
        }
        newFunction(name,func=this.newObject,idx=0) {
                const f = document.createElement("button");
                f.textContent = name;
                f.addEventListener("click",func);
                f.style.minHeight = "48px";
                this.functionsSection[idx].appendChild(f);
        }
        modifySelectedAttr(config) {
                if (this.selectedObject === "") return;
                const object = this.interface.renderer.frames[this.interface.frame][this.selectedObject];
                for (let item in config) {
                        object[item] = config[item]
                }

                this.interface.render();
        }
        updateObjectSelectionText() {
                if (this.selectedObject === "") {
                        this.selectedObjectText.textContent = "No Objects Selected!";
                        return;
                }
                const obj = this.interface.renderer.frames[this.interface.frame][this.selectedObject];
                if (this.selectedShape < 0) {
                        this.selectedObjectText.textContent = `${this.selectedObject}${obj.state!==undefined?": "+obj.state:""}`;
                        return;
                }
                this.selectedObjectText.textContent = `${this.selectedObject}${obj.state!==undefined?": "+this.selectedObject.state:""}>${obj.shapes?obj.shapes[this.selectedShape].name:obj.frames[obj.state].shapes[this.selectedShape].name}`;
        }
}

document.body.style.backgroundColor = "gainsboro";
const canvas = document.createElement("canvas");canvas.width = 600;canvas.height = 400;canvas.style.backgroundColor = "white";
const renderer = new Renderer(canvas);
const i = new Interface(renderer);
const gui = new GUI(i);

const objects = document.createElement("div");
const functions = [
        document.createElement("div"), // Frame or Animation Related
        document.createElement("div"), // Object Related
        document.createElement("div") // Shape Related
];
const shapes = document.createElement("div");

function styleContainer(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "row";
        dom.style.maxWidth = (window.innerWidth/2)+"px";
        dom.style.minHeight = "48px";
        dom.style.height = "48px";
        dom.style.overflowX = "scroll";
        dom.style.marginBottom = "5px";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollLeft += e.deltaY;
        });
}
styleContainer(objects);
functions.forEach(div=>styleContainer(div));
styleContainer(shapes);

gui.objectsSection = objects;
gui.shapesSection = shapes;
gui.updateObjects();
gui.functionsSection = functions;

const imgCanvas = document.createElement("img");
const imgObject = document.createElement("img");
const imgShape = document.createElement("img");
imgCanvas.src = "./canvas.png";
imgObject.src = "./object.png";
imgShape.src = "./shape.png";
[imgCanvas,imgObject,imgShape].forEach(i=>{
        i.style.marginRight = "10px";
        i.style.width = "32px";
        i.style.height = "32px";
        i.style.alignSelf = "center";
});

gui.functionsSection[0].appendChild(imgCanvas);
gui.functionsSection[1].appendChild(imgObject);
gui.functionsSection[2].appendChild(imgShape);

gui.newFunction("New Rect",()=>gui.newObject(),1);
gui.newFunction("New Empty Object",()=>gui.newObject("MyObject",[],0,0),1);
gui.newFunction("New Oval",()=>gui.newObject("MyObject",[new Shape(ENUM.OVAL,0,0,50,50)],0,0),1);
gui.newFunction("Delete Selected",()=>gui.removeSelected(),1);
gui.newFunction("Copy Selected",()=>{
        if (gui.selectedObject === "") {
                gui.interface.objectClipboard = {};
                return;
        }
        let frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.interface.objectClipboard = structuredClone(frame[gui.selectedObject]);
        gui.interface.objectClipboard.name = gui.selectedObject
},1);
gui.newFunction("Paste Object",()=>{
        if (Object.keys(gui.interface.objectClipboard).length<1) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.interface.objectClipboard.name]) {
                gui.interface.objectClipboard.name += "Copy";
        }

        frame[gui.interface.objectClipboard.name] = gui.interface.objectClipboard
        delete frame[gui.interface.objectClipboard.name].name;
        gui.render();
},1);
gui.newFunction("Import Project",()=>{
        gui.interface.frame = 0;

        const f = document.createElement("input");
        f.type = "file";

        f.addEventListener("change",e=>{
                const file = e.target.files[0];
                if (!file) return;
                const fReader = new FileReader();
                fReader.onload=function(e){
                        const project = JSON.parse(e.target.result);
                        document.title = `GoodForYou v${ver}: Editing ${project.projectName}`;
                        gui.interface.renderer.frames = project.frames;
                        gui.render();
                }
                fReader.readAsText(file);
        })
        
        f.click();
});
gui.newFunction("New Sequence Object",()=>{
        let name = "MyObjectSequence";
        while (gui.interface.renderer.frames[gui.interface.frame][name]) name += "Copy";
        gui.interface.renderer.frames[gui.interface.frame][name] = {};
        gui.interface.renderer.frames[gui.interface.frame][name].state = 0;
        gui.interface.renderer.frames[gui.interface.frame][name].frames = [
                new Object_([],0,0)
        ];
        gui.interface.renderer.frames[gui.interface.frame][name].x = 0;
        gui.interface.renderer.frames[gui.interface.frame][name].y = 0;
        gui.render();
},1);
gui.newFunction("Paste Into Sequence State",()=>{
        if (gui.selectedObject === "") return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes) return;
        obj.frames[obj.state] = gui.interface.objectClipboard;
        gui.render();
},1);
gui.newFunction("Set Sequence State",()=>{
        if (gui.selectedObject === "") return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes) return;
        obj.state = Number(prompt("Set State To..."));
        gui.render();
},1);
gui.newFunction("Toggle Selected Visibility",()=>{
        if (gui.selectedObject === "") return;
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.visible === undefined) {
                const objFS = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
                obj.frames[obj.state].visible = !(obj.frames[obj.state].visible);
        }
        obj.visible = !(obj.visible);
        gui.render();
},1);
gui.newFunction("Create New State For Selected Sequence",()=>{
        if (gui.selectedObject === "") return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes) return;

        obj.frames.push(new Object_([],0,0));
        obj.state = obj.frames.length-1;
        gui.render();
},1);
gui.newFunction("Export Project (.json)",()=>{
        let input = prompt("Enter a name!");
        let jsonFile = JSON.stringify(
                {
                        projectName: input!==""?input:"My Project!",
                        frames: gui.interface.renderer.frames
                }
        );
        const blob = new Blob([jsonFile],{type:"text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const reg = /[^a-z0-9_]/gi;
        a.download = `${input.replaceAll(reg,"")}.json`;

        a.click();
        a.remove();
});
gui.newFunction("Update Render",()=>gui.interface.render());
gui.newFunction("Move By",()=>{
        if (gui.selectedObject === "") return;
        const frames = gui.interface.renderer.frames;
        const frame = frames[gui.interface.frame];
        const obj = frame[gui.selectedObject];

        let inputX = prompt("Move X by...");
        obj.x += isNaN(inputX)?0:Number(inputX);
        let inputY = prompt("Move Y by...");
        obj.y += isNaN(inputY)?0:Number(inputY);

        gui.interface.render();
},1);
gui.newFunction("Move To",()=>{
        if (gui.selectedObject === "") return;
        let inputX = prompt("Move X to...");
        inputX = isNaN(inputX)?0:Number(inputX)
        let inputY = prompt("Move Y to...");
        inputY = isNaN(inputY)?0:Number(inputY)
        
        gui.modifySelectedAttr({x:inputX,y:inputY})
},1);
gui.newFunction("Go To Previous Frame",()=>{
        if (gui.interface.frame == 0) return;
        gui.interface.frame--;
        gui.render()
});
gui.newFunction("Go To Next Frame",()=>{
        if (gui.interface.frame == gui.interface.renderer.frames.length-1) return;
        gui.interface.frame++;
        gui.render();
});
gui.newFunction("New Frame",()=>{
        gui.interface.createNewFrame();
        gui.render();
});
gui.newFunction("Play/Stop",()=>{
        if (gui.playing) {
                clearInterval(gui.interval)
                gui.playing = false;
                return;
        }
        gui.playing = true;
        gui.interval = setInterval(()=>{
                gui.interface.frame++;
                if (gui.interface.frame>gui.interface.renderer.frames.length-1) gui.interface.frame = 0;
                gui.render();
                gui.interface.render();
        },gui.speed*1000);
});
gui.newFunction("Copy Frame",()=>{
        gui.interface.copyFrame();
});
gui.newFunction("Paste Frame",()=>{
        if (Object.keys(gui.interface.clipboard).length<1) return;
        gui.interface.pasteFrame();
        gui.render();
});
gui.newFunction("Remove Frame",()=>{
        gui.interface.deleteFrame();
});
gui.newFunction("Rename Selected",()=>{
        if (gui.selectedObject === "") return;
        let input = prompt("Enter a new name!");
        gui.interface.renderer.frames[gui.interface.frame][input!==""?input:gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        gui.selectedObject = input;
        gui.render();
        gui.selectedObjectText.textContent = gui.selectedObject;
},1);
gui.newFunction("New Rect Shape",()=>{
        if (gui.selectedObject === "") return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        (frame[gui.selectedObject].shapes?frame[gui.selectedObject].shapes:frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes).push(new Shape(
                ENUM.RECTANGLE,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newFunction("New Oval Shape",()=>{
        if (gui.selectedObject === "") return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        (frame[gui.selectedObject].shapes?frame[gui.selectedObject].shapes:frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes).push(new Shape(
                ENUM.OVAL,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newFunction("Size By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        let inputW = prompt("Size Shape Width By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes[gui.selectedShape].w += inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].h += inputH;
        gui.render();
},2);
gui.newFunction("Size To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        let inputW = prompt("Size Shape Width To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes[gui.selectedShape].w = inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].h = inputH;
        gui.render();
},2);
gui.newFunction("Shift By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        let inputW = prompt("Shift Shape X By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes[gui.selectedShape].x += inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].y += inputH;
        gui.render();
},2);
gui.newFunction("Shift To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        let inputW = prompt("Shift Shape X To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes[gui.selectedShape].x = inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].y = inputH;
        gui.render();
},2);
gui.newFunction("Copy Selected",()=>{
        if (gui.selectedShape < 0) {
                gui.interface.shapeClipboard = {};
                return;
        }
        let frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.interface.shapeClipboard = structuredClone(frame[gui.selectedObject].shapes[gui.selectedShape]);
},2);
gui.newFunction("Paste Shape",()=>{
        if (Object.keys(gui.interface.shapeClipboard).length<1) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes.push(gui.interface.shapeClipboard);
        gui.render();
},2);
gui.newFunction("Rename Selected",()=>{
        if (gui.selectedShape < 0) return;
        let input = prompt("Enter a new name!");
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        const object = frame[gui.selectedObject];
        object.shapes[gui.selectedShape].name = input;
        gui.render();
        gui.updateObjectSelectionText();
},2);
gui.newFunction("Delete Selected",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes.splice(gui.selectedShape,1);
        gui.selectedShape = -1;
        
        gui.render()
},2);

document.body.style.display = "flex";
document.body.style.flexDirection = "column";
document.body.style.alignItems = "center";

const currentFrame = document.createElement("span");
const selectedObject = document.createElement("span");

gui.currentFrameText = currentFrame;
currentFrame.textContent = "Frame " + gui.interface.frame;
gui.selectedObjectText = selectedObject;
selectedObject.textContent = "No Selected Objects!";

const horizontalContainer = document.createElement("div");
horizontalContainer.style.display = "flex";
horizontalContainer.style.flexDirection = "row";
horizontalContainer.style.minWidth = window.innerWidth+"px";
const objShapeContainer = document.createElement("div");
const sectionContainer = document.createElement("div");
sectionContainer.style.marginRight = "10px";

function styleContainers(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "column";
        dom.style.minHeight = "200px";
        dom.style.maxHeight = "200px";
        dom.style.overflowY = "scroll";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollTop += e.deltaY;
        });
}
[objShapeContainer,sectionContainer].forEach(e=>styleContainers(e));

const editContainer = document.createElement("div");
editContainer.style.display = "flex";
editContainer.style.flexDirection = "column";
editContainer.style.height = "0px";

const about = document.createElement("button");
about.textContent = "Notes & Credits";
about.addEventListener("click",()=>{
        alert("Created by Cookie/Biscgames\nAll icons by https://icons8.com/\n\nYou can report any bugs on my discord server: https://discord.gg/k6dptVBm\nOr open an issue: https://github.com/biscgames/goodforyou");
})

document.body.onload = ()=>{
        document.body.appendChild(about);
        document.body.appendChild(canvas);
        document.body.appendChild(currentFrame);
        document.body.appendChild(selectedObject);
        functions.forEach(div=>sectionContainer.appendChild(div));
        objShapeContainer.appendChild(objects);
        objShapeContainer.appendChild(shapes);
        horizontalContainer.appendChild(sectionContainer);
        horizontalContainer.appendChild(objShapeContainer);
        editContainer.appendChild(horizontalContainer)
        document.body.appendChild(editContainer);
        gui.render();
};


let JANITOR = false; // JANITOR prevents excessive debug logging
const ver = "A2";
document.title = `GoodForYou v${ver}`;