const ENUM = {
        RECTANGLE: 0,
        OVAL: 1,
        TRIANGLE: 2
}
class Shape {
        type = ENUM.RECTANGLE;
        w = 10;
        h = 10;
        x = 0;
        y = 0;
        rotation = 0;
        color = "rgb(0,0,0)";
        constructor(type=ENUM.RECTANGLE,x=0,y=0,w=50,h=50) {
                this.name = type==ENUM.RECTANGLE?"MyRect":type==ENUM.OVAL?"MyOval":"MyTriangle";
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
        rotation = 0;
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
        backgroundColor = "#FFFFFF";
        camera = undefined;
        cameraObj = undefined;
        selectedObject = "";
        selectedShape = -1;

        constructor(canvas) {
                this.canvas = canvas;
                this.frames = [{}];
                this.ctx = this.canvas.getContext("2d");
        }
        render(frame=0) {
                if (this.camera && !this.frames[frame][this.camera]) this.frames[frame][this.camera] = structuredClone(this.cameraObj);
                const cam = this.camera?this.frames[frame][this.camera]:{x:0,y:0};
                let objects = this.frames[frame];

                const ctx = this.ctx;

                ctx.fillStyle = this.backgroundColor;
                ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
                const drawShape = (shape,objX,objY,selected,idx) => {
                        if (!shape.color) shape.color = "rgb(0,0,0)";
                        if (!shape.rotation) shape.rotation = 0;
                        ctx.fillStyle = shape.color;
                        let path = new Path2D;
                        let func = {0:(x,y,w,h)=>path.rect(x-25,y-25,w,h),1:(x,y,w,h)=>{path.ellipse((x-25)+w/2,(y-25)+h/2,w/2,h/2,0,0,2*Math.PI)},2:(x,y,w,h)=>{
                                path.moveTo((x-25)+w,(y-25)+h);
                                path.lineTo((x-25)+w,(y-25));
                                path.lineTo((x-25),(y-25));
                                path.lineTo((x-25)+w,(y-25)+h);
                        }}
                        let shapeX = objX + shape.x;
                        let shapeY = objY + shape.y;
                        func[shape.type](shapeX,shapeY,shape.w,shape.h);
                        path.closePath();
                        ctx.fill(path);

                        if (!selected) return;
                        if (this.selectedShape > -1 && this.selectedShape != idx) return;
                        
                        ctx.strokeStyle = "rgba(0, 0, 255, 1)";
                        ctx.lineWidth = 5;
                        ctx.stroke(path);

                }
                const drawObject = (object,offsetX=0,offsetY=0,selected,rotationOffset=0) => {
                        if (object.visible == false) return;
                        if (!object.rotation) object.rotation = 0;
                        if (!object.shapes && object.frames) {
                                drawObject(object.frames[object.state],object.x,object.y,selected);
                                return;
                        }
                        if (object.objects && !object.textContent) {
                                let groupX = object.x + offsetX-cam.x;
                                let groupY = object.y + offsetY-cam.y;
                                this.ctx.save();
                                const firstChild = object.objects[Object.keys(object.objects)[0]]||{x:0,y:0};
                                const groupCenterX = groupX+firstChild.x;
                                const groupCenterY = groupY+firstChild.y;
                                this.ctx.translate(groupCenterX,groupCenterY);
                                this.ctx.rotate((object.rotation+rotationOffset)*Math.PI/180);
                                this.ctx.translate(-groupCenterX,-groupCenterY);
                                for (let idx in object.objects) drawObject(object.objects[idx],object.x,object.y,selected,0);
                                this.ctx.restore();
                                return;
                        }
                        let objW = 0;
                        let objH = 0;

                        let minX = 0;
                        let maxX = 0;
                        let minY = 0;
                        let maxY = 0;
                        for (let shape of (object.shapes||[])) {
                                minX = Math.min(shape.w,shape.x+objW);
                                minY = Math.min(shape.h,shape.y+objH);
                                maxX = Math.max(shape.w,shape.x+objW);
                                maxY = Math.max(shape.h,shape.y+objH);
                        }
                        object.w = maxX-minX;
                        object.h = maxY-minY;

                        let objX = object.x+offsetX-cam.x;
                        let objY = object.y+offsetY-cam.y;

                        let i = 0;
                        this.ctx.save();

                        this.ctx.font = object.fontSize+"px Roboto";
                        if (object.w < 1 && object.textContent) {
                                let metrics = ctx.measureText(object.textContent);
                                object.w = metrics.width;
                                object.h = object.fontSize;
                        }
                        const centerX = objX + objW/2;
                        const centerY = objY + objH/2;

                        this.ctx.translate(centerX,centerY);
                        this.ctx.rotate((object.rotation+rotationOffset)*Math.PI/180);
                        this.ctx.translate(-centerX,-centerY);

                        if (object.textContent) {
                                this.ctx.fillStyle = object.color;
                                this.ctx.fillText(object.textContent,objX-object.w/2,objY);
                                this.ctx.restore();
                                return
                        }

                        for (let shape of object.shapes) {
                                this.ctx.save();
                                this.ctx.translate(centerX,centerY);
                                this.ctx.rotate((shape.rotation+rotationOffset)*Math.PI/180);
                                this.ctx.translate(-centerX,-centerY);
                                drawShape(shape,objX,objY,selected,i);
                                this.ctx.restore();
                                i++;
                        }
                        this.ctx.restore();
                }

                this.ctx.save();
                this.ctx.translate(this.canvas.width/2,this.canvas.height/2);
                Object.entries(objects).forEach(([key,object])=>drawObject(object,0,0,key===this.selectedObject));
                this.ctx.restore();
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
        selectedObjectSection = undefined; // DOM div
        selectedShapeSection = undefined; // DOM div
        parent = [];
        functionsSection = []; // [DOM div]
        shapesSection = undefined; // DOM div
        currentFrameText = undefined; // DOM p|DOM span
        selectedObjectText = undefined; // DOM p|DOM span
        speed = 0.2;
        playing = false;
        interval = 0;
        movePixels = 50;
        objShapeContainer = undefined;
        history = [];
        dropdownSections = undefined;
        constructor(interface_) {
                this.interface = interface_;
        }
        updateObjects() {
                this.shapesSection.style.display = "none";
                this.objectsSection.style.display = "none";

                this.objectsSection.innerHTML = "";
                this.shapesSection.innerHTML = "";

                let deselectObjectButton = document.createElement("button");
                deselectObjectButton.textContent = "Deselect";
                deselectObjectButton.addEventListener("click",()=>{
                        this.selectedObject = "";
                        if (this.selectedShape > -1) this.selectedShape = -1;
                        this.parent = [];
                        this.render();
                        this.updateObjectSelectionText();
                })
                if (this.selectedObject !== "") this.objectsSection.appendChild(deselectObjectButton);

                let deselectShapeButton = document.createElement("button");
                deselectShapeButton.textContent = "Deselect";
                deselectShapeButton.addEventListener("click",()=>{
                        this.selectedShape = -1;
                        this.render();
                        this.updateObjectSelectionText();
                })
                if (this.selectedShape > -1) this.shapesSection.appendChild(deselectShapeButton);

                const frames = this.interface.renderer.frames
                const selectedFrame = this.interface.frame

                let firstRowFunc = ()=> {
                        return frames[selectedFrame]?.[this.parent[this.parent.length-2]]?.objects ?? frames[selectedFrame];
                }
                const firstRow = firstRowFunc();

                if (Object.keys(firstRow).length<1) return;
                this.objectsSection.style.display = "flex";
                for (let objName in firstRow) {
                        const f = document.createElement("button");
                        f.textContent = objName;
                        f.addEventListener("click",()=>{
                                if (this.parent.indexOf(f.textContent)>-1) {
                                        this.parent.pop();
                                }
                                this.selectedObject = f.textContent;
                                this.render();
                                this.updateObjectSelectionText();
                        })
                        this.objectsSection.appendChild(f);
                }

                this.selectedObjectSection.style.display = "none";
                this.selectedShapeSection.style.display = "none";
                if (this.selectedObject === "") return;
                this.shapesSection.style.display = "flex";
                this.selectedObjectSection.style.display = "flex";

                let secondRowFunc = (get)=>{
                        return get?.shapes
                        ?? get?.objects
                        ?? get?.frames[get?.state]?.shapes
                        ?? []
                }
                const secondRow = secondRowFunc(this.getSelectedObject());

                if (Object.keys(secondRow).length<1) return;
                for (let objName in secondRow) {
                        const f = document.createElement("button");

                        const shapeTester = secondRow[objName]?.name
                        f.textContent = shapeTester?shapeTester:objName;
                        let cache = objName;
                        f.addEventListener("click",()=>{
                                if (shapeTester) {
                                        this.selectedShape = cache;
                                } else {
                                        this.parent.push(this.selectedObject);
                                        this.selectedObject = cache;
                                }
                                this.render();
                                this.updateObjectSelectionText();
                        })

                        this.shapesSection.appendChild(f);
                }

                if (this.selectedShape < 0) return;
                this.selectedShapeSection.style.display = "flex";
        }
        getSelectedObject() {
                let path = this.interface.renderer.frames[this.interface.frame];
                let getSelected = ()=> {
                        path = path[this.selectedObject];
                        return path;
                }
                if (this.parent.length<1) {
                        return getSelected();
                }
                for (let item of this.parent) {
                        path = path[item]?.objects;
                }
                return getSelected();
        }
        render() {
                requestAnimationFrame(()=>{
                        this.interface.renderer.selectedObject = this.selectedObject;
                        this.interface.renderer.selectedShape = this.selectedShape;
                        this.interface.render();
                        this.currentFrameText.textContent = "Frame " + this.interface.frame;
                })
                
                this.updateObjects();
        }
        historyStack() {
                if (this.history.length >= 5) return;
                this.history.push({
                        frame: this.interface.frame,
                        objects: structuredClone(this.interface.renderer.frames[this.interface.frame]),
                });
        }
        popHistoryStack() { // (aka undo)
                if (this.history.length <= 0) return;
                const lastSave = this.history[this.history.length-1];
                this.interface.renderer.frames[lastSave.frame] = lastSave.objects;
                this.render();
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
                this.historyStack();
                const sel = this.interface.frame;
                const frame = this.getSelectedObject()?.objects??this.interface.renderer.frames[sel];
                while (frame[name]) {name += "Copy"}
                
                frame[name] = new Object_(shapes,x,y);

                this.render();
        }
        removeSelected() {
                this.historyStack();
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
        newDropdownCategory(name) {
                this.dropdownSections.style.display = "flex";
                this.dropdownSections.style.flexDirection = "row";
                const f = document.createElement("span");
                f.style.display = "flex";
                f.style.flexDirection = "column";
                f.textContent = name;
                f.style.marginRight = "10px";
                f.style.backgroundColor = "#FFFFFF";
                f.addEventListener("click",()=>{
                        Array.from(f.children).forEach(e=>{e.style.display==="block"?e.style.display="none":e.style.display="block";});
                        f.style.backgroundColor = f.children[0].style.display=="block"?"#a2a2a2ff":"#FFFFFF";
                })
                this.dropdownSections.appendChild(f);
        }
        newDropdownFunction(name,func,idx=0) {
                let f = this.dropdownSections.children[idx];
                const g = document.createElement("span");
                g.style.display = "none";
                g.textContent = name;
                g.addEventListener("click",()=>{
                        if (g.style.display !== "block") return;
                        func()
                        setTimeout(()=>{
                                Array.from(f.children).forEach(e=>e.style.display="none");
                                f.style.backgroundColor = "#FFFFFF";
                        },300)
                });
                f.appendChild(g);
        }

        newSelectedObjFunction(name,func=this.newObject) {
                const f = document.createElement("button");
                f.textContent = name;
                f.addEventListener("click",func);
                f.style.maxHeight = "48px";
                this.selectedObjectSection.appendChild(f);
        }
        newSelectedShapeFunction(name,func=this.newObject) {
                const f = document.createElement("button");
                f.textContent = name;
                f.addEventListener("click",func);
                f.style.maxHeight = "48px";
                this.selectedShapeSection.appendChild(f);
        }
        modifySelectedAttr(config) {
                if (this.selectedObject === "") return;
                const object = gui.getSelectedObject();
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
                this.selectedObjectText.textContent = "";
                if (this.parent.length>0) {
                        for (let item of this.parent) this.selectedObjectText.textContent += item+" > ";
                }
                const obj = this.getSelectedObject();
                this.selectedObjectText.textContent += this.selectedObject + (obj?.state ? `[${obj?.state}]` : "");
                if (this.selectedShape < 0) return;
                this.selectedObjectText.textContent += " > "+obj.shapes[this.selectedShape].name+` (${this.selectedShape})`;
        }
        draggingWithMouse(object,x,y) {
                const obj = this.interface.renderer.frames[this.interface.frame][object];
                obj.x = x;
                obj.y = y;
        }
}

document.body.style.backgroundColor = "gainsboro";
const canvas = document.createElement("canvas");canvas.width = 600;canvas.height = 400;canvas.style.backgroundColor = "white";
const renderer = new Renderer(canvas);
const i = new Interface(renderer);
const gui = new GUI(i);

gui.selectedObjectSection = document.createElement("div");
gui.selectedShapeSection = document.createElement("div");

const objects = document.createElement("div");
const shapes = document.createElement("div");
const functions = [document.createElement("div"),document.createElement("div"),document.createElement("div")];

function styleIMG(img,src) {
        img.src = src;
        img.style.height = "48px";
        img.style.width = "48px";
}
functions[0].appendChild(document.createElement("img"));
functions[1].appendChild(document.createElement("img"));
functions[2].appendChild(document.createElement("img"));
styleIMG(functions[0].querySelector("img"),"./canvas.png")
styleIMG(functions[1].querySelector("img"),"./object.png")
styleIMG(functions[2].querySelector("img"),"./shape.png")
const functionHolder = document.createElement("div");
gui.dropdownSections = document.createElement("div");

gui.objectsSection = objects;
gui.shapesSection = shapes;
gui.functionsSection = functions;
gui.functionsSection.forEach(e=>e.style.display = "flex");
gui.functionsSection.forEach(e=>e.style.flexDirection = "row");
gui.functionsSection.forEach(e=>e.style.overflowY = "scroll");
gui.functionsSection.forEach(e=>e.style.maxWidth = window.innerWidth+"px");

functionHolder.style.display = "flex"
functionHolder.style.flexDirection = "column";
gui.functionsSection.forEach(e=>functionHolder.appendChild(e));

const shapesFunctions = document.createElement("div");
shapesFunctions.style.display = "none";
gui.selectedShapeSection = shapesFunctions;

gui.updateObjects();

gui.newDropdownCategory("Canvas");
gui.newDropdownCategory("Object");
gui.newDropdownCategory("Shape");
gui.newDropdownFunction("Test Dropdowns",()=>{
        console.log("Hello, World!");
})

gui.newDropdownFunction("+ Rect Object",()=>gui.newObject(),1);
gui.newDropdownFunction("+ Empty Object",()=>gui.newObject("MyObject",[],0,0),1);
gui.newDropdownFunction("+ Oval Object",()=>gui.newObject("MyObject",[new Shape(ENUM.OVAL,0,0,50,50)],0,0),1);
gui.newDropdownFunction("+ Sequence Object",()=>{
        gui.historyStack();
        let name = "MyObjectSequence";
        const sel = gui.getSelectedObject()?.objects??gui.interface.renderer.frames[gui.interface.frame];
        while (sel[name]) name += "Copy";
        sel[name] = {};
        sel[name].state = 0;
        sel[name].frames = [
                new Object_([],0,0)
        ];
        sel[name].x = 0;
        sel[name].y = 0;
        gui.render();
},1);
gui.newDropdownFunction("+ Text Object",()=>{
        gui.historyStack();
        let name = "MyText";
        const sel = gui.getSelectedObject()?.objects??gui.interface.renderer.frames[gui.interface.frame];
        while (sel[name]) name += "Copy";
        sel[name] = {};
        sel[name].textContent = "I am a text!";
        sel[name].fontSize = 20
        sel[name].x = 0;
        sel[name].y = 0;
        sel[name].color = "#000000";
        gui.render();
},1);
gui.newDropdownFunction("+ Group",()=>{
        gui.historyStack();
        let name = "MyObjectGroup";
        const sel = gui.getSelectedObject()?.objects??gui.interface.renderer.frames[gui.interface.frame];
        while (sel[name]) name += "Copy";
        sel[name] = {};
        sel[name].objects = {};
        sel[name].x = 0;
        sel[name].y = 0;
        sel[name].rotation = 0;
        gui.render();
},1);
if (window.innerWidth <= 720) gui.newSelectedObjFunction("Select Shape",()=>gui.closeSelectSection());
if (window.innerWidth <= 720) gui.newSelectedShapeFunction("Deselect",()=>{
        gui.selectedShape = -1;
        gui.closeSelectSection();
        setTimeout(()=>gui.openSelectSection(),100);
});
gui.newDropdownFunction("Modify Studs",()=>{
        let input = prompt(`Move objects by... (prev ${gui.movePixels}px)`);
        input = isNaN(input)?0:Number(input);
        gui.movePixels = input
});
gui.newSelectedObjFunction("Modify Studs",()=>{
        let input = prompt(`Move objects by... (prev ${gui.movePixels}px)`);
        input = isNaN(input)?0:Number(input);
        gui.movePixels = input
});
gui.newSelectedShapeFunction("Modify Studs",()=>{
        let input = prompt(`Move objects by... (prev ${gui.movePixels}px)`);
        input = isNaN(input)?0:Number(input);
        gui.movePixels = input
});
gui.newSelectedObjFunction("< GO LEFT",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        obj.x -= gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("< GO LEFT",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        let temp = gui.getSelectedObject();
        if (temp.frames) {
                let obj = temp.frames[temp.state].shapes[gui.selectedShape];
                obj.x -= gui.movePixels;
                gui.render();
                return
        }
        let obj = temp.shapes[gui.selectedShape];
        obj.x -= gui.movePixels;
        gui.render();
});
gui.newSelectedObjFunction("GO RIGHT >",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        obj.x += gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("GO RIGHT >",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        let temp = gui.getSelectedObject();
        if (temp.frames) {
                let obj = temp.frames[temp.state].shapes[gui.selectedShape];
                obj.x += gui.movePixels;
                gui.render();
                return
        }
        let obj = temp.shapes[gui.selectedShape];
        obj.x += gui.movePixels;
        gui.render();
});
gui.newSelectedObjFunction("^ GO UP",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        obj.y -= gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("^ GO UP",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        let temp = gui.getSelectedObject();
        if (temp.frames) {
                let obj = temp.frames[temp.state].shapes[gui.selectedShape];
                obj.y -= gui.movePixels;
                gui.render();
                return
        }
        let obj = temp.shapes[gui.selectedShape];
        obj.y -= gui.movePixels;
        gui.render();
});
gui.newSelectedObjFunction("v GO DOWN",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        obj.y += gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("v GO DOWN",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        let temp = gui.getSelectedObject();
        if (temp.frames) {
                let obj = temp.frames[temp.state].shapes[gui.selectedShape];
                obj.y += gui.movePixels;
                gui.render();
                return
        }
        let obj = temp.shapes[gui.selectedShape];
        obj.y += gui.movePixels;
        gui.render();
});
gui.newDropdownFunction("Delete Selected",()=>{gui.removeSelected();gui.selectedObjectSection.style.display="none";gui.render()});
gui.newSelectedObjFunction("Delete Selected",()=>{gui.removeSelected();gui.selectedObjectSection.style.display="none";gui.render()});
gui.newSelectedObjFunction("Rotate Object",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        let inputR = prompt("Rotate by... (Degrees)");
        inputR = isNaN(inputR)?0:Number(inputR);
        obj.rotation = inputR
        gui.render();
});
gui.newSelectedShapeFunction("Rotate Shape",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        const obj = gui.getSelectedObject();

        let inputR = prompt("Rotate by... (Degrees)");
        inputR = isNaN(inputR)?0:Number(inputR);
        obj.rotation = inputR
        gui.render();
})
gui.newDropdownFunction("Copy",()=>{
        if (gui.selectedObject === "") {
                gui.interface.objectClipboard = {};
                return;
        }
        obj = gui.getSelectedObject();
        gui.interface.objectClipboard = structuredClone(obj);
        gui.interface.objectClipboard.name = gui.selectedObject
},1);
gui.newDropdownFunction("Paste",()=>{
        if (Object.keys(gui.interface.objectClipboard).length<1) return;
        gui.historyStack();
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        while (frame[gui.interface.objectClipboard.name]) gui.interface.objectClipboard.name += "Copy";

        frame[gui.interface.objectClipboard.name] = gui.interface.objectClipboard
        delete frame[gui.interface.objectClipboard.name].name;
        gui.render();
},1);
gui.newDropdownFunction("Paste > Sequence State",()=>{
        if (gui.selectedObject === "" || Object.keys(gui.interface.objectClipboard).length<1) return;
        gui.historyStack();
        let obj = gui.getSelectedObject();
        if (obj.shapes) return;
        obj.frames[obj.state] = gui.interface.objectClipboard;
        gui.render();
},1);
gui.newDropdownFunction("Paste > Group",()=>{
        if (gui.selectedObject === "" || Object.keys(gui.interface.objectClipboard).length<1) return;
        gui.historyStack();
        let obj = gui.getSelectedObject();
        if (obj.shapes || obj.frames) return;
        while (obj.objects[gui.interface.objectClipboard.name]) gui.interface.objectClipboard.name += "Copy";
        obj.objects[gui.interface.objectClipboard.name] = gui.interface.objectClipboard;
        delete obj.objects[gui.interface.objectClipboard.name].name;
        gui.render();
},1);
gui.newDropdownFunction("Remove from Group",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject]
        gui.render();
},1);
gui.newDropdownFunction("Rename Selected",()=>{
        if (gui.selectedObject === "") return;
        if (gui.parent.length > 0) {
                alert("You cannot rename objects inside of a group");
                return
        }
        let input = prompt("Enter a new name!");
        if (gui.interface.renderer.camera === gui.selectedObject) gui.interface.renderer.camera = input;
        gui.interface.renderer.frames[gui.interface.frame][input!==""?input:gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        gui.selectedObject = input;
        gui.render();
        gui.selectedObjectText.textContent = gui.selectedObject;
},1);
gui.newDropdownFunction("Set Sequence State",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        let obj = gui.getSelectedObject();
        if (obj.shapes) return;
        obj.state = Number(prompt("Set State To..."));
        gui.render();
},1);
gui.newDropdownFunction("Set as Camera",()=>{
        if (gui.selectedObject === "") return;
        gui.interface.renderer.camera = gui.selectedObject;
        gui.interface.renderer.cameraObj = gui.getSelectedObject();
        alert("You have set this object as a camera. This object will be duplicated to other frames that don't have the object.")
        gui.render();
},1);
gui.newFunction("Remove Camera",()=>{
        gui.interface.renderer.camera = undefined;
},1);
gui.newSelectedObjFunction("Remove Camera",()=>{
        gui.interface.renderer.camera = undefined;
});
gui.newDropdownFunction("Import Project",()=>{
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
                        gui.speed = project.animationSpeed||0.1;
                        gui.interface.renderer.backgroundColor = project.backgroundColor||"#FFFFFF";
                        gui.render();
                }
                fReader.readAsText(file);
                f.remove();
        })
        
        f.click();
});
gui.newFunction("BG Color",()=>{
        const colorPicker = document.createElement("input");
        colorPicker.type = "color"
        colorPicker.click()

        colorPicker.addEventListener("change",()=>{
                gui.historyStack();
                gui.interface.renderer.backgroundColor = colorPicker.value;
                setTimeout(()=>{
                        gui.render();
                        colorPicker.remove();
                },100);
        })
});
gui.newDropdownFunction("Export Object",()=>{
        const obj = gui.getSelectedObject();
        let jsonFile = JSON.stringify(
                {
                        name: gui.selectedObject,
                        contents: obj
                }
        );
        const blob = new Blob([jsonFile],{type:"text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const reg = /[^a-z0-9_]/gi;
        a.download = `${gui.selectedObject.replaceAll(reg,"")}.json`;

        a.click();
        a.remove();
},1);
gui.newDropdownFunction("Set Text",()=>{
        const obj = gui.getSelectedObject();
        if (!obj.textContent) return;
        gui.historyStack();
        obj.textContent = prompt("What should the text be?");
        gui.render();
},1);
gui.newSelectedObjFunction("Size Up Text",()=>{
        const obj = gui.getSelectedObject();
        if (!obj.textContent) return;
        gui.historyStack();
        obj.fontSize += 5
        gui.render();
});
gui.newSelectedObjFunction("Size Down Text",()=>{
        const obj = gui.getSelectedObject();
        if (!obj.textContent) return;
        gui.historyStack();
        obj.fontSize -= 5
        gui.render();
});
gui.newDropdownFunction("Import Object",()=>{
        const f = document.createElement("input");
        f.type = "file";

        f.addEventListener("change",e=>{
                gui.historyStack();
                const file = e.target.files[0];
                if (!file) return;
                const fReader = new FileReader();
                fReader.onload=function(e){
                        const obj = JSON.parse(e.target.result);
                        gui.interface.renderer.frames[gui.interface.frame][obj.name] = obj.contents;
                        gui.render();
                }
                fReader.readAsText(file);
                f.remove();
        })
        
        f.click();
},1);
gui.newDropdownFunction("Add New State > Sequence",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        let obj = gui.getSelectedObject();
        if (obj.shapes) return;

        obj.frames.push(new Object_([],0,0));
        obj.state = obj.frames.length-1;
        gui.render();
},1);
gui.newDropdownFunction("Remove State > Sequence",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();

        const obj = gui.getSelectedObject();
        obj.frames.splice(obj.state,1);
        if (obj.state > obj.frames.length-1) obj.state = obj.frames.length-1;
        gui.render();
},1);
gui.newDropdownFunction("Toggle Visibility",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        if (obj.visible === undefined) {
                const objFS = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
                obj.frames[obj.state].visible = !(obj.frames[obj.state].visible);
        }
        obj.visible = !(obj.visible);
        gui.render();
});
gui.newSelectedObjFunction("Toggle Visibility",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        if (obj.visible === undefined) {
                const objFS = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
                obj.frames[obj.state].visible = !(obj.frames[obj.state].visible);
        }
        obj.visible = !(obj.visible);
        gui.render();
});
gui.newDropdownFunction("Export Project (.json)",()=>{
        let input = prompt("Enter a name!");
        let jsonFile = JSON.stringify(
                {
                        projectName: input!==""?input:"My Project!",
                        frames: gui.interface.renderer.frames,
                        animationSpeed: gui.speed,
                        backgroundColor: gui.interface.renderer.backgroundColor
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
gui.newFunction("Anim Speed",()=>{
        let input = prompt("Set speed to...");
        input = isNaN(input)?0.1:Number(input);
        gui.speed = input;
});
gui.newDropdownFunction("Move By",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const frames = gui.interface.renderer.frames;
        const frame = frames[gui.interface.frame];
        const obj = gui.getSelectedObject();

        let inputX = prompt("Move X by...");
        obj.x += isNaN(inputX)?0:Number(inputX);
        let inputY = prompt("Move Y by...");
        obj.y += isNaN(inputY)?0:Number(inputY);

        gui.interface.render();
},1);
gui.newDropdownFunction("Move To",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        let inputX = prompt("Move X to...");
        inputX = isNaN(inputX)?0:Number(inputX)
        let inputY = prompt("Move Y to...");
        inputY = isNaN(inputY)?0:Number(inputY)
        
        gui.modifySelectedAttr({x:inputX,y:inputY})
},1);
gui.newDropdownFunction("Debug Selected",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const obj = gui.getSelectedObject();
        alert(JSON.stringify(obj,null,2));
},1);
gui.newDropdownFunction("Debug Everything",()=>{
        const obj = {
                renderer: gui.interface.renderer,
                interface: gui.interface,
                gui: gui
        };
        alert(JSON.stringify(obj,null,2));
});
gui.newFunction("< Frame",()=>{
        if (gui.interface.frame == 0) return;
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.interface.frame--;
        gui.render()
});
gui.newFunction("Frame >",()=>{
        if (gui.interface.frame == gui.interface.renderer.frames.length-1) return;
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.interface.frame++;
        gui.render();
});
gui.newFunction("+ Frame",()=>{
        gui.interface.createNewFrame();
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.render();
});
gui.newFunction("Play/Stop",()=>{
        if (gui.playing) {
                clearInterval(gui.interval)
                gui.playing = false;
                return;
        }
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.playing = true;
        gui.interval = setInterval(()=>{
                gui.interface.frame++;
                if (gui.interface.frame>gui.interface.renderer.frames.length-1) gui.interface.frame = 0;
                gui.render();
                gui.interface.render();
        },gui.speed*1000);
});
gui.newDropdownFunction("Copy Frame",()=>{
        gui.interface.copyFrame();
});
gui.newFunction("Paste Frame",()=>{
        if (Object.keys(gui.interface.clipboard).length<1) return;
        gui.interface.pasteFrame();
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.render();
});
gui.newFunction("Delete Frame",()=>{
        gui.parent = undefined;
        gui.selectedObject = "";
        gui.interface.deleteFrame();
});
gui.newDropdownFunction("+ Rect Shape",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.getSelectedObject().shapes.push(new Shape(
                ENUM.RECTANGLE,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newDropdownFunction("+ Oval Shape",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.getSelectedObject().shapes.push(new Shape(
                ENUM.OVAL,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newDropdownFunction("+ Triangle Shape",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.getSelectedObject().shapes.push(new Shape(
                ENUM.TRIANGLE,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newDropdownFunction("Delete Selected",()=>{
        if ((gui.selectedObject === "" && gui.selectedShape < 0)) return;
        gui.historyStack();
        if (gui.interface.renderer.camera === gui.selectedObject) {
                alert("To remove the camera, please click the remove camera button, then delete selected.");
                return;
        }
        if (gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].frames) {
                gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].frames[gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].state].shapes.splice(gui.selectedShape,1);
                gui.selectedShape = -1;

                gui.render();
                return;
        }
        gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes.splice(gui.selectedShape,1);
        gui.selectedShape = -1;
        
        gui.render();
},2);
gui.newDropdownFunction("Copy",()=>{
        if (gui.selectedShape < 0 || gui.parent) {
                gui.interface.shapeClipboard = {};
                return;
        }
        let frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.selectedObject].frames) {
                gui.interface.shapeClipboard = structuredClone(frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape]);
                return;
        }
        gui.interface.shapeClipboard = structuredClone(frame[gui.selectedObject].shapes[gui.selectedShape]);
},2);
gui.newDropdownFunction("Paste",()=>{
        if (Object.keys(gui.interface.shapeClipboard).length<1) return;
        gui.historyStack();
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes.push(gui.interface.shapeClipboard);
        gui.render();
},2);
gui.newDropdownFunction("Rename Selected",()=>{
        if (gui.selectedShape < 0) return;
        gui.historyStack();
        let input = prompt("Enter a new name!");
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.selectedObject].frames) {
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].name = input;
                gui.render();
                return;
        }
        const object = frame[gui.selectedObject];
        object.shapes[gui.selectedShape].name = input;
        gui.render();
        gui.updateObjectSelectionText();
},2);
gui.newSelectedShapeFunction("Size By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        gui.historyStack();
        let inputW = prompt("Size Shape Width By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        if (gui.getSelectedObject().frames) {
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].w += inputW;
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].h += inputH;
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].x += inputW/2;
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].y += inputH/2;
                gui.render();
                return;
        }
        gui.getSelectedObject().shapes[gui.selectedShape].w += inputW;
        gui.getSelectedObject().shapes[gui.selectedShape].h += inputH;
        gui.render();
});
gui.newSelectedShapeFunction("Size To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        gui.historyStack();
        let inputW = prompt("Size Shape Width To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        if (gui.getSelectedObject().frames) {
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].w = inputW;
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].h = inputH;
                gui.render();
                return;
        }
        gui.getSelectedObject().shapes[gui.selectedShape].w = inputW;
        gui.getSelectedObject().shapes[gui.selectedShape].h = inputH;
        gui.render();
});
gui.newDropdownFunction("Shift By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        gui.historyStack();
        let inputW = prompt("Shift Shape X By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        if (gui.getSelectedObject().frames) {
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].x += inputW;
                gui.getSelectedObject().frames[gui.getSelectedObject().state].shapes[gui.selectedShape].y += inputH;
                gui.render();
                return;
        }
        gui.getSelectedObject().shapes[gui.selectedShape].x += inputW;
        gui.getSelectedObject().shapes[gui.selectedShape].y += inputH;
        gui.render();
},2);
gui.newDropdownFunction("Shift To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0) return;
        gui.historyStack();
        let inputW = prompt("Shift Shape X To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        gui.getSelectedObject().shapes[gui.selectedShape].x = inputW;
        gui.getSelectedObject().shapes[gui.selectedShape].y = inputH;
        gui.render();
},2);
gui.newDropdownFunction("Change Color",()=>{
        if (gui.selectedObject === "") return;
        gui.historyStack();
        const colorPicker = document.createElement("input");
        colorPicker.type = "color"
        colorPicker.click()

        colorPicker.addEventListener("change",()=>{
                const obj = gui.getSelectedObject();
                if (obj.color) {
                        obj.color = colorPicker.value;
                        gui.render();
                        colorPicker.remove();
                        return
                }
                if (gui.selectedShape < 0) {
                        for (let shape of obj.shapes) shape.color = colorPicker.value;
                        gui.render();
                        return;
                }
                obj.shapes[gui.selectedShape].color = colorPicker.value;
                gui.render();
                colorPicker.remove();
        })
},2);
gui.newFunction("Modify Attributes",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        gui.historyStack();
        const shape = gui.getSelectedObject().shapes[gui.selectedShape];
        const config = JSON.parse(prompt(`Enter a JSON string to modify attributes!\nDon't know what to do?\nTry opening console and typing in "gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes[gui.selectedShape]" to get the properties of the shape!`));
        
        for (let key in config) {
                shape[key] = config[key];
        }
        
        gui.render();
},2);
gui.newDropdownFunction("Move down",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        gui.historyStack();
        const object = gui.getSelectedObject();
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape-1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape-1]);
        object.shapes[gui.selectedShape-1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape--;
        gui.render();
});
gui.newSelectedShapeFunction("Move down",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        gui.historyStack();
        const object = gui.getSelectedObject();
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape-1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape-1]);
        object.shapes[gui.selectedShape-1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape--;
        gui.render();
});
gui.newDropdownFunction("Move up",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        gui.historyStack();
        const object = gui.getSelectedObject();
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape+1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape+1]);
        object.shapes[gui.selectedShape+1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape++;
        gui.render();
});
gui.newSelectedShapeFunction("Move up",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        gui.historyStack();
        const object = gui.getSelectedObject();
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape+1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape+1]);
        object.shapes[gui.selectedShape+1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape++;
        gui.render();
});
gui.newFunction("Undo",()=>gui.popHistoryStack());

gui.selectedObjectText = document.createElement("span");
gui.currentFrameText = document.createElement("span");

gui.objectsSection = document.createElement("div");
gui.shapesSection = document.createElement("div");

gui.selectedObjectSection.style.display = "none";
gui.selectedShapeSection.style.display = "none";

canvas.addEventListener("click",e=>{
        console.log("LOGD")
        const canvRect = canvas.getBoundingClientRect();
        let clientX = e.clientX-canvRect.left;
        let clientY = e.clientY-canvRect.top;
        console.log(clientX,clientY)
        const frame = gui.interface.renderer.frames[gui.interface.frame]
        let cam = frame[gui.interface.renderer.camera]?frame[gui.interface.renderer.camera]:{x:0,y:0};
        function selectShapes(obj,objX,objY) {
                gui.selectedShape = -1;
                for (let idx=obj.shapes.length-1;idx>=0;idx--) {
                        const shape = obj.shapes[idx];
                        const shapeX = objX + shape.x;
                        const shapeY = objY + shape.y;
                        if (clientX>=shapeX-25&&clientX<=shapeX+shape.w&&clientY>=shapeY-25&&clientY<=shapeY+shape.h) {
                                gui.selectedShape = idx;
                                break;
                        }
                }
        }
        for (let i=Object.keys(frame).length-1;i>=0;i--) {
                const k = Object.keys(frame)[i];
                const obj = frame[k];
                if (!obj||obj.visible===false) continue;
                const objX = obj.x-cam.x+canvas.width/2;
                const objY = obj.y-cam.y+canvas.height/2;
                const objW = obj.w||0;
                const objH = obj.h||0;
                if (clientX>=objX-25&&clientX<=objX+objW&&clientY>=objY-25&&clientY<=objY+objH) {
                        if (gui.selectedObject !== "") selectShapes(obj,objX,objY);
                        gui.selectedObject = k;
                        gui.render();
                        break;
                }
        }
});

document.body.style.padding = "20px";
document.body.style.display = "flex";
document.body.style.flexDirection = "column";
const edit = document.createElement("div");
edit.style.display = "flex";
edit.style.flexDirection = "column";

canvas.width = 500;
canvas.height = 300;
canvas.style.width = canvas.width+"px";
canvas.style.height = canvas.height+"px";

const hierarchySection = document.createElement("div");
hierarchySection.style.display = "flex";
gui.objectsSection.style.display = "flex";
gui.objectsSection.style.flexDirection = "column";
gui.objectsSection.style.height = "100px";
gui.objectsSection.style.overflowY = "scroll";
gui.shapesSection.style.display = "flex";
gui.shapesSection.style.flexDirection = "column";
gui.shapesSection.style.height = "100px";
gui.shapesSection.style.overflowY = "scroll";
gui.selectedObjectSection.style.display = "none";
gui.selectedObjectSection.style.height = "100px";
gui.selectedObjectSection.style.overflowY = "scroll";
gui.selectedObjectSection.style.flexDirection = "column";
gui.selectedShapeSection.style.height = "100px";
gui.selectedShapeSection.style.overflowY = "scroll";
gui.selectedShapeSection.style.flexDirection = "column";
hierarchySection.appendChild(gui.objectsSection);
hierarchySection.appendChild(gui.shapesSection);
hierarchySection.appendChild(gui.selectedObjectSection);
hierarchySection.appendChild(gui.selectedShapeSection);

const initializeBody = ()=>{
        document.body.innerHTML = '';
        gui.updateObjectSelectionText();
        edit.appendChild(gui.selectedObjectText);
        edit.appendChild(gui.currentFrameText);
        edit.appendChild(functionHolder);
        edit.appendChild(canvas);
        edit.appendChild(hierarchySection);
        document.body.appendChild(gui.dropdownSections);
        document.body.appendChild(edit);
        gui.render();
};
document.body.onload = initializeBody;
window.addEventListener("resize",initializeBody);

let JANITOR = true; // JANITOR prevents excessive debug logging
const ver = "B3";
document.title = `GoodForYou v${ver}, Group Nesting!`;
