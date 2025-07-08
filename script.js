// So I'm thinking, before implementing UI features we should create some type
// of interface by running user functions in a console.

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
        constructor(shapes=[],x=0,y=0) {
                this.shapes = shapes;
                this.x = x;
                this.y = y;
        }
}
class ObjectSequence {
        frames = []; // : Object
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
                const drawObject = (object) => {
                        if (object instanceof ObjectSequence) {
                                drawObject(object.frames[object.state]);
                                return;
                        }

                        let objW = 0;
                        let objH = 0;
                        for (let shape of object.shapes) {
                                if (shape.w > objW) objW = shape.w;
                                if (shape.h > objH) objH = shape.h;
                        }
                        let objX = object.x + ((this.canvas.width/2)-(objW/2));
                        let objY = object.y + ((this.canvas.height/2)-(objH/2));

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
        objectsSection = undefined; // DOM div
        functionsSection = undefined; // DOM div
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
                        this.selectedObjectText.textContent = "";
                });
                this.objectsSection.innerHTML = '';
                this.objectsSection.appendChild(deselect);

                const sel = this.interface.frame;
                const frame = this.interface.renderer.frames[sel];

                for (let objectName in frame) {
                        const btn = document.createElement("button");
                        btn.textContent = objectName;
                        btn.addEventListener("click",()=>{
                                this.selectedObject = btn.textContent;
                                this.selectedObjectText.textContent = this.selectedObject;
                        });
                        this.objectsSection.appendChild(btn)
                }
        }
        render() {
                this.interface.render();
                this.currentFrameText.textContent = this.interface.frame;
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
                this.selectedObjectText.textContent = "";

                this.interface.render();
                this.updateObjects();
        }
        newFunction(name,func=this.newObject) {
                const f = document.createElement("button");
                f.textContent = name;
                f.addEventListener("click",func);
                this.functionsSection.appendChild(f);
        }
        modifySelectedAttr(config) {
                if (this.selectedObject === "") return;
                const object = this.interface.renderer.frames[this.interface.frame][this.selectedObject];
                for (let item in config) {
                        object[item] = config[item]
                }

                this.interface.render();
        }
}

document.body.style.backgroundColor = "gainsboro";
const canvas = document.createElement("canvas");canvas.width = 600;canvas.height = 400;canvas.style.backgroundColor = "white";
const renderer = new Renderer(canvas);
const i = new Interface(renderer);
const gui = new GUI(i);

const objects = document.createElement("div");
const functions = document.createElement("div");

function styleContainer(dom) {
        dom.style.display = "flex";
        dom.style.flexDirection = "row";
        dom.style.maxWidth = "512px";
        dom.style.height = "48px";
        dom.style.overflowX = "scroll";
        dom.addEventListener("wheel",e=>{
                if (e.deltaY==0) return;
                e.preventDefault();
                dom.scrollLeft += e.deltaY;
        });
}
styleContainer(objects);
styleContainer(functions);

gui.objectsSection = objects;
gui.updateObjects();
gui.functionsSection = functions;
gui.newFunction("New Rect",()=>gui.newObject());
gui.newFunction("New Oval",()=>gui.newObject("MyObject",[new Shape(ENUM.OVAL,0,0,50,50)],0,0));
gui.newFunction("Delete Selected",()=>gui.removeSelected());
gui.newFunction("Update Render",()=>gui.interface.render())
gui.newFunction("Move By",()=>{
        if (gui.selectedObject === "") return;
        const frames = gui.interface.renderer.frames;
        const frame = frames[gui.interface.frame];
        const obj = frame[gui.selectedObject];

        let inputX = prompt("Move X by...");
        obj.x += Number(isNaN(inputX)?0:Number(inputX));
        let inputY = prompt("Move Y by...");
        obj.y += Number(isNaN(inputY)?0:Number(inputY));

        gui.interface.render();
});
gui.newFunction("Move To",()=>{
        if (gui.selectedObject === "") return;
        let inputX = prompt("Move X to...");
        inputX = isNaN(inputX)?0:Number(inputX)
        let inputY = prompt("Move Y to...");
        inputY = isNaN(inputY)?0:Number(inputY)
        
        gui.modifySelectedAttr({x:inputX,y:inputY})
});
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
})
gui.newFunction("Cut Frame",()=>{
        gui.interface.cutFrame();
        gui.render();
})
gui.newFunction("Paste Frame",()=>{
        if (Object.keys(gui.interface.clipboard).length<1) return;
        gui.interface.pasteFrame();
        gui.render();
})
gui.newFunction("Rename Selected",()=>{
        if (gui.selectedObject === "") return;
        let input = prompt("Enter a new name!");
        gui.interface.renderer.frames[gui.interface.frame][input!==""?input:gui.selectedObject] = structuredClone(gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject]);
        delete gui.interface.renderer.frames[gui.interface.frame][gui.selectedObject];
        gui.selectedObject = input;
        gui.render();
        gui.selectedObjectText.textContent = gui.selectedObject;
})

document.body.style.display = "flex";
document.body.style.flexDirection = "column";
document.body.style.alignItems = "center";

const currentFrame = document.createElement("span");
const selectedObject = document.createElement("span");

gui.currentFrameText = currentFrame;
currentFrame.textContent = gui.interface.frame;
gui.selectedObjectText = selectedObject;
selectedObject.textContent = gui.selectedObject;

$("body").ready(()=>{
        document.body.appendChild(functions);
        document.body.appendChild(objects);
        document.body.appendChild(canvas);
        document.body.appendChild(currentFrame)
        document.body.appendChild(selectedObject)
});


let JANITOR = false; // JANITOR prevents excessive debug logging