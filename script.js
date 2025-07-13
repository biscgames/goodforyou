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
                const drawObject = (object,offsetX=0,offsetY=0,selected) => {
                        if (object.visible == false) return;
                        if (!object.rotation) object.rotation = 0;
                        if (!object.shapes && object.frames) {
                                drawObject(object.frames[object.state],object.x,object.y,selected);
                                return;
                        }
                        if (object.objects && !object.textContent) {
                                for (let idx in object.objects) {
                                        drawObject(object.objects[idx],object.x,object.y,selected);
                                }
                                return;
                        }
                        let objW = 0;
                        let objH = 0;

                        let minX = 0;
                        let maxX = 0;
                        let minY = 0;
                        let maxY = 0;
                        for (let shape of (object.shapes||[])) {
                                minX = Math.max(shape.w,shape.x+objW);
                                minY = Math.max(shape.h,shape.y+objH);
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
                        this.ctx.rotate((object.rotation)*Math.PI/180);
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
                                this.ctx.rotate((shape.rotation)*Math.PI/180);
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
        parent = "";
        functionsSection = []; // [DOM div]
        shapesSection = undefined; // DOM div
        currentFrameText = undefined; // DOM p|DOM span
        selectedObjectText = undefined; // DOM p|DOM span
        speed = 0.2;
        playing = false;
        interval = 0;
        movePixels = 50;
        objShapeContainer = undefined;
        constructor(interface_) {
                this.interface = interface_;
        }
        updateObjects() {
                let deselect = document.createElement("button");
                deselect.textContent = "Deselect";
                deselect.addEventListener("click",()=>{
                        this.interface.renderer.selectedObject = "";
                        this.selectedObject = "";
                        this.parent = undefined;
                        this.selectedShape = -1;
                        this.interface.renderer.selectedShape = -1;
                        this.updateObjects();
                        this.updateObjectSelectionText();
                        window.scrollTo(0,0);
                        this.render();
                });
                let deselectShape = document.createElement("button");
                deselectShape.textContent = "Deselect";
                deselectShape.addEventListener("click",()=>{
                        this.interface.renderer.selectedShape = -1;
                        this.selectedShape = -1;
                        this.updateObjectSelectionText();
                        this.render();
                });
                this.objectsSection.innerHTML = '';
                this.shapesSection.innerHTML = '';
                this.shapesSection.style.display = "none";
                this.objectsSection.style.display = "none";
                this.objectsSection.appendChild(deselect);
                if (window.innerWidth > 720) this.shapesSection.appendChild(deselectShape);

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
                                this.render();
                                if (window.innerWidth <= 720 && gui.openSelectSection) gui.openSelectSection();
                        });
                        this.objectsSection.appendChild(btn)
                }

                this.selectedObjectSection.style.display = "none";
                this.selectedShapeSection.style.display = "none";
                if (this.selectedObject === "") return;
                this.shapesSection.style.display = "flex";
                if (this.selectedShape < 0 && window.innerWidth > 720) this.selectedObjectSection.style.display = "flex";

                let obj = frame[this.parent]?frame[this.parent].objects[this.selectedObject]:frame[this.selectedObject]
                let shapes = obj.shapes
                if (!obj.shapes && obj.frames) {
                        shapes = obj.frames[obj.state].shapes
                };
                if (obj.objects) {
                        for (let name in frame[this.selectedObject].objects) {
                                const btn = document.createElement("button");
                                btn.textContent = name;
                                btn.addEventListener("click",()=>{
                                        this.parent = this.selectedObject;
                                        this.selectedObject = btn.textContent;
                                        this.updateObjectSelectionText();
                                });
                                this.shapesSection.appendChild(btn);
                        }
                        return;
                };
                let i = 0;
                for (let shape of shapes||[]) {
                        const btn = document.createElement("button");
                        btn.textContent = shape.name + `(${i})`;
                        let copy = i;
                        btn.addEventListener("click",()=>{
                                this.selectedShape = copy;
                                this.updateObjectSelectionText();
                                this.render();
                                if (window.innerWidth <= 720 && gui.openSelectSection) gui.openSelectSection();
                        })
                        this.shapesSection.appendChild(btn);
                        i++;
                }
                if (this.selectedShape < 0) return;
                if (window.innerWidth > 720) this.selectedShapeSection.style.display = "flex";
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
                const frame = this.interface.renderer.frames[this.interface.frame];
                const object = frame[this.parent]?frame[this.parent].objects[this.selectedObject]:frame[this.selectedObject];
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
                        if (this.parent) {
                                this.selectedObjectText.textContent = this.parent+">"+this.selectedObject;
                                return
                        }
                        this.selectedObjectText.textContent = !obj.frames?this.selectedObject:this.selectedObject+"["+obj.state+"]";
                        return
                }
                if (this.parent) {
                        this.selectedObjectText.textContent = this.parent+">"+this.selectedObject+">"+(obj.shapes?obj.shapes[this.selectedShape].name:obj.frames[obj.state].shapes[this.selectedShape].name);
                        return
                }
                this.selectedObjectText.textContent = (!obj.frames?this.selectedObject:this.selectedObject+"["+obj.state+"]")+">"+(obj.shapes?obj.shapes[this.selectedShape].name:obj.frames[obj.state].shapes[this.selectedShape].name);
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

const selectedObjectFunctions = document.createElement("div");
styleContainerVertically(selectedObjectFunctions);
gui.selectedObjectSection = selectedObjectFunctions;

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
        dom.style.overflowY = "hidden";
        dom.style.marginBottom = "5px";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollLeft += e.deltaY;
        });
}
function styleContainerVertically(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "column";
        dom.style.minWidth = "200px";
        dom.style.width = "200px";
        dom.style.minHeight = "150px";
        dom.style.maxHeight = "150px";
        dom.style.overflowY = "scroll";
        dom.style.overflowX = "hidden";
        dom.style.marginBottom = "5px";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollTop += e.deltaY;
        });
}

gui.objectsSection = objects;
gui.shapesSection = shapes;
gui.functionsSection = functions;

const shapesFunctions = document.createElement("div");
styleContainerVertically(shapesFunctions);
shapesFunctions.style.display = "none";
gui.selectedShapeSection = shapesFunctions;

gui.updateObjects();

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

gui.newFunction("+ Rect Object",()=>gui.newObject(),1);
gui.newFunction("+ Empty Object",()=>gui.newObject("MyObject",[],0,0),1);
gui.newFunction("+ Oval Object",()=>gui.newObject("MyObject",[new Shape(ENUM.OVAL,0,0,50,50)],0,0),1);
gui.newFunction("+ Sequence Object",()=>{
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
gui.newFunction("+ Text Object",()=>{
        let name = "MyText";
        while (gui.interface.renderer.frames[gui.interface.frame][name]) name += "Copy";
        gui.interface.renderer.frames[gui.interface.frame][name] = {};
        gui.interface.renderer.frames[gui.interface.frame][name].textContent = "I am a text!";
        gui.interface.renderer.frames[gui.interface.frame][name].fontSize = 20
        gui.interface.renderer.frames[gui.interface.frame][name].x = 0;
        gui.interface.renderer.frames[gui.interface.frame][name].y = 0;
        gui.interface.renderer.frames[gui.interface.frame][name].color = "#000000";
        gui.render();
},1);
gui.newFunction("+ Group",()=>{
        let name = "MyObjectGroup";
        while (gui.interface.renderer.frames[gui.interface.frame][name]) name += "Copy";
        gui.interface.renderer.frames[gui.interface.frame][name] = {};
        gui.interface.renderer.frames[gui.interface.frame][name].objects = {};
        gui.interface.renderer.frames[gui.interface.frame][name].x = 0;
        gui.interface.renderer.frames[gui.interface.frame][name].y = 0;
        gui.render();
},1);
if (window.innerWidth <= 720) gui.newSelectedObjFunction("Select Shape",()=>gui.closeSelectSection());
if (window.innerWidth <= 720) gui.newSelectedShapeFunction("Deselect",()=>{
        gui.selectedShape = -1;
        gui.closeSelectSection();
        setTimeout(()=>gui.openSelectSection(),100);
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
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        obj.x -= gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("< GO LEFT",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        let temp = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
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
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        obj.x += gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("GO RIGHT >",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        let temp = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
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
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        obj.y -= gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("^ GO UP",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        let temp = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
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
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        obj.y += gui.movePixels;
        gui.render();
});
gui.newSelectedShapeFunction("v GO DOWN",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        let temp = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
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
gui.newSelectedObjFunction("Delete Selected",()=>{gui.removeSelected();gui.selectedObjectSection.style.display="none";gui.render()});
gui.newSelectedObjFunction("Rotate Object",()=>{
        if (gui.selectedObject === "") return;
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        let inputR = prompt("Rotate by... (Degrees)");
        inputR = isNaN(inputR)?0:Number(inputR);
        obj.rotation = inputR
        gui.render();
});
gui.newSelectedShapeFunction("Rotate Shape",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0) return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes[gui.selectedShape];
        let inputR = prompt("Rotate by... (Degrees)");
        inputR = isNaN(inputR)?0:Number(inputR);
        obj.rotation = inputR
        gui.render();
});
gui.newSelectedObjFunction("Copy",()=>{
        if (gui.selectedObject === "") {
                gui.interface.objectClipboard = {};
                return;
        }
        let frame = gui.interface.renderer.frames[gui.interface.frame];
        gui.interface.objectClipboard = structuredClone(!gui.parent?frame[gui.selectedObject]:frame[gui.parent].objects[gui.selectedObject]);
        gui.interface.objectClipboard.name = gui.selectedObject
});
gui.newFunction("Paste",()=>{
        if (Object.keys(gui.interface.objectClipboard).length<1) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        while (frame[gui.interface.objectClipboard.name]) gui.interface.objectClipboard.name += "Copy";

        frame[gui.interface.objectClipboard.name] = gui.interface.objectClipboard
        delete frame[gui.interface.objectClipboard.name].name;
        gui.render();
},1);
gui.newSelectedObjFunction("Paste > Sequence State",()=>{
        if (gui.selectedObject === "" || Object.keys(gui.interface.objectClipboard).length<1) return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes) return;
        obj.frames[obj.state] = gui.interface.objectClipboard;
        gui.render();
});
gui.newSelectedObjFunction("Pst > Group",()=>{
        if (gui.selectedObject === "" || Object.keys(gui.interface.objectClipboard).length<1) return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes || obj.frames) return;
        while (obj.objects[gui.interface.objectClipboard.name]) gui.interface.objectClipboard.name += "Copy";
        obj.objects[gui.interface.objectClipboard.name] = gui.interface.objectClipboard;
        delete obj.objects[gui.interface.objectClipboard.name].name;
        gui.render();
});
gui.newSelectedObjFunction("Remove from Group",()=>{
        if (gui.selectedObject === "" || gui.parent === "") return;
        gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject]
        gui.render();
});
gui.newSelectedObjFunction("Rename Selected",()=>{
        if (gui.selectedObject === "") return;
        if (gui.parent !== "") {
                alert("You cannot rename objects inside of a group");
        }
        let input = prompt("Enter a new name!");
        if (gui.interface.renderer.camera === gui.selectedObject) gui.interface.renderer.camera = input;
        gui.interface.renderer.frames[gui.interface.frame][input!==""?input:gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        gui.selectedObject = input;
        gui.render();
        gui.selectedObjectText.textContent = gui.selectedObject;
});
gui.newSelectedObjFunction("Set Sequence State",()=>{
        if (gui.selectedObject === "") return;
        let obj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        if (obj.shapes) return;
        obj.state = Number(prompt("Set State To..."));
        gui.render();
});
gui.newSelectedObjFunction("Set as Camera",()=>{
        if (gui.selectedObject === "") return;
        gui.interface.renderer.camera = gui.selectedObject;
        gui.interface.renderer.cameraObj = !gui.parent?gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]:gui.interface.renderer.frames[gui.interface.frame][gui.parent].objects[gui.selectedObject];
        alert("You have set this object as a camera. This object will be duplicated to other frames that don't have the object.")
        gui.render();
});
gui.newFunction("Remove Camera",()=>{
        gui.interface.renderer.camera = undefined;
},1);
gui.newSelectedObjFunction("Remove Camera",()=>{
        gui.interface.renderer.camera = undefined;
});
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
                gui.interface.renderer.backgroundColor = colorPicker.value;
                setTimeout(()=>{
                        gui.render();
                        colorPicker.remove();
                },100);
        })
});
gui.newSelectedObjFunction("Export Object",()=>{
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
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
});
gui.newSelectedObjFunction("Set Text",()=>{
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (!obj.textContent) return;
        obj.textContent = prompt("What should the text be?");
        gui.render();
});
gui.newSelectedObjFunction("Size Up Text",()=>{
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (!obj.textContent) return;
        obj.fontSize += 5
        gui.render();
});
gui.newSelectedObjFunction("Size Down Text",()=>{
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (!obj.textContent) return;
        obj.fontSize -= 5
        gui.render();
});
gui.newFunction("Import Object",()=>{
        const f = document.createElement("input");
        f.type = "file";

        f.addEventListener("change",e=>{
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
gui.newSelectedObjFunction("Add New State > Sequence",()=>{
        if (gui.selectedObject === "") return;
        let obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.shapes) return;

        obj.frames.push(new Object_([],0,0));
        obj.state = obj.frames.length-1;
        gui.render();
});
gui.newSelectedObjFunction("Remove State > Sequence",()=>{
        if (gui.selectedObject === "") return;

        obj.frames.splice(obj.state,1);
        if (obj.state > obj.frames.length-1) obj.state = obj.frames.length-1;
        gui.render();
});
gui.newSelectedObjFunction("Toggle Visibility",()=>{
        if (gui.selectedObject === "") return;
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        if (obj.visible === undefined) {
                const objFS = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]
                obj.frames[obj.state].visible = !(obj.frames[obj.state].visible);
        }
        obj.visible = !(obj.visible);
        gui.render();
});
gui.newFunction("Export Project (.json)",()=>{
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
gui.newFunction("Move By",()=>{
        if (gui.selectedObject === "") return;
        const frames = gui.interface.renderer.frames;
        const frame = frames[gui.interface.frame];
        const obj = frame[gui.parent]?frame[gui.parent].objects[gui.selectedObject]:frame[gui.selectedObject];

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
gui.newFunction("Debug Selected",()=>{
        if (gui.selectedObject === "") return;
        const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        alert(JSON.stringify(obj,null,2));
},1);
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
gui.newFunction("Copy Frame",()=>{
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
gui.newFunction("+ Rect Shape",()=>{
        if (gui.selectedObject === "" || gui.parent) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        (frame[gui.selectedObject].shapes?frame[gui.selectedObject].shapes:frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes).push(new Shape(
                ENUM.RECTANGLE,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newFunction("+ Oval Shape",()=>{
        if (gui.selectedObject === "" || gui.parent) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        (frame[gui.selectedObject].shapes?frame[gui.selectedObject].shapes:frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes).push(new Shape(
                ENUM.OVAL,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newFunction("+ Triangle Shape",()=>{
        if (gui.selectedObject === "" || gui.parent) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        (frame[gui.selectedObject].shapes?frame[gui.selectedObject].shapes:frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes).push(new Shape(
                ENUM.TRIANGLE,
                0,0,
                50,50
        ));
        gui.render();
},2);
gui.newSelectedShapeFunction("Delete Selected",()=>{
        if ((gui.selectedObject === "" && gui.selectedShape < 0) || gui.parent) return;
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
});
gui.newSelectedShapeFunction("Copy",()=>{
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
});
gui.newFunction("Paste",()=>{
        if (Object.keys(gui.interface.shapeClipboard).length<1 || gui.parent) return;
        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes.push(gui.interface.shapeClipboard);
        gui.render();
},2);
gui.newSelectedShapeFunction("Rename Selected",()=>{
        if (gui.selectedShape < 0 || gui.parent) return;
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
});
gui.newSelectedShapeFunction("Size By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        let inputW = prompt("Size Shape Width By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.selectedObject].frames) {
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].w += inputW;
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].h += inputH;
                gui.render();
                return;
        }
        frame[gui.selectedObject].shapes[gui.selectedShape].w += inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].h += inputH;
        gui.render();
});
gui.newSelectedShapeFunction("Size To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        let inputW = prompt("Size Shape Width To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Size Shape Height To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.selectedObject].frames) {
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].x += inputW;
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].y += inputH;
                gui.render();
                return;
        }
        frame[gui.selectedObject].shapes[gui.selectedShape].w = inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].h = inputH;
        gui.render();
});
gui.newFunction("Shift By",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        let inputW = prompt("Shift Shape X By...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y By...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        if (frame[gui.selectedObject].frames) {
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].x += inputW;
                frame[gui.selectedObject].frames[frame[gui.selectedObject].state].shapes[gui.selectedShape].y += inputH;
                gui.render();
                return;
        }
        frame[gui.selectedObject].shapes[gui.selectedShape].x += inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].y += inputH;
        gui.render();
},2);
gui.newFunction("Shift To",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        let inputW = prompt("Shift Shape X To...");
        inputW = isNaN(inputW)?0:Number(inputW);
        let inputH = prompt("Shift Shape Y To...");
        inputH = isNaN(inputH)?0:Number(inputH);

        const frame = gui.interface.renderer.frames[gui.interface.frame];
        frame[gui.selectedObject].shapes[gui.selectedShape].x = inputW;
        frame[gui.selectedObject].shapes[gui.selectedShape].y = inputH;
        gui.render();
},2);
gui.newFunction("Change Color",()=>{
        if (gui.selectedObject === "") return;
        const colorPicker = document.createElement("input");
        colorPicker.type = "color"
        colorPicker.click()

        colorPicker.addEventListener("change",()=>{
                const obj = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
                if (obj.color) {
                        obj.color = colorPicker.value;
                        gui.render();
                        colorPicker.remove();
                        return
                }
                if (gui.selectedShape < 0) {
                        for (let shape of gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes) shape.color = colorPicker.value;
                        gui.render();
                        return;
                }
                gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes[gui.selectedShape].color = colorPicker.value;
                gui.render();
                colorPicker.remove();
        })
},2);
gui.newFunction("Change Type",()=>{
        if (gui.selectedObject === "" || gui.selectedShape < 0 || gui.parent) return;
        const shape = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject].shapes[gui.selectedShape]

        shape.type = shape.type===0?1:0;
        gui.render();
},2);
gui.newSelectedShapeFunction("Move down",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        const object = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape-1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape-1]);
        object.shapes[gui.selectedShape-1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape--;
        gui.render();
});
gui.newSelectedShapeFunction("Move up",()=>{
        if (gui.selectedObject === "" && gui.selectedShape < 0 || gui.parent) return;
        const object = gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        const shape = object.shapes[gui.selectedShape];
        if (!object.shapes[gui.selectedShape+1]) return;
        const shapePrev = structuredClone(object.shapes[gui.selectedShape+1]);
        object.shapes[gui.selectedShape+1] = shape;
        object.shapes[gui.selectedShape] = shapePrev;
        gui.selectedShape++;
        gui.render();
});

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
gui.objShapeContainer = objShapeContainer;
const sectionContainer = document.createElement("div");
sectionContainer.style.marginRight = "10px";

function styleContainers(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "column"
        if (window.innerWidth<=720) dom.style.maxWidth = "250px" 
        dom.style.minHeight = "200px";
        dom.style.maxHeight = "200px";
        dom.style.overflowY = "scroll";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollTop += e.deltaY;
        });
}
function styleContainersHorizontally(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "row";
        dom.style.minWidth = "400px";
        dom.style.maxWidth = "400px";
        dom.style.overflowY = "scroll";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollTop += e.deltaY;
        });
}
styleContainers(sectionContainer);
styleContainersHorizontally(objShapeContainer);

const editContainer = document.createElement("div");
editContainer.style.display = "flex";
editContainer.style.flexDirection = "column";
editContainer.style.height = "0px";

const about = document.createElement("button");
about.textContent = "Notes & Credits";
about.addEventListener("click",()=>{
        alert("Created by Cookie/Biscgames\nAll icons by https://icons8.com/\n\nYou can report any bugs on my discord server: https://discord.gg/k6dptVBm\nOr open an issue: https://github.com/biscgames/goodforyou");
})
gui.openSelectSection = ()=>{
        if (gui.selectedObject === "") return;
        objShapeContainer.style.minWidth = "200px";
        objShapeContainer.style.maxWidth = "200px";
        gui.selectedShapeSection.style.display = "none";
        if (gui.selectedShape > -1) {
                gui.selectedShapeSection.style.display = "flex";
                return;
        }
        gui.selectedObjectSection.style.display = "flex";
};
gui.closeSelectSection = ()=>{
        objShapeContainer.style.minWidth = "400px";
        objShapeContainer.style.maxWidth = "400px";
        gui.selectedShapeSection.style.display = "none";
        gui.selectedObjectSection.style.display = "none";
};
const buttons = document.createElement("div");
buttons.style.display = "flex";
buttons.style.flexDirection = "row";
buttons.appendChild(about);

functions.forEach(div=>sectionContainer.appendChild(div));
objShapeContainer.appendChild(objects);
objShapeContainer.appendChild(shapes);
horizontalContainer.appendChild(sectionContainer);
horizontalContainer.appendChild(objShapeContainer);
selectedObjectFunctions.style.display = "none";
horizontalContainer.appendChild(selectedObjectFunctions);
horizontalContainer.appendChild(shapesFunctions);
editContainer.appendChild(horizontalContainer)

styleContainerVertically(objects);
functions.forEach(div=>styleContainer(div));
styleContainerVertically(shapes);
alert("The rendering system has been majorly modified, if you have any projects created before A5, I suggest tweaking them now.");
const initializeBody = ()=>{
        document.body.innerHTML = '';
        document.body.appendChild(buttons);
        document.body.appendChild(canvas);
        document.body.appendChild(currentFrame);
        document.body.appendChild(selectedObject);
        document.body.appendChild(editContainer);
        gui.render();
};
document.body.onload = initializeBody;
window.addEventListener("resize",initializeBody);

let JANITOR = false; // JANITOR prevents excessive debug logging
const ver = "A5";
document.title = `GoodForYou v${ver}`;