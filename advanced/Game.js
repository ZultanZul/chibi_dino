import * as THREE from '../libs/threejs/three.module.js';
import { LoopOnce } from '../libs/threejs/three.module.js';
import { GLTFLoader } from '../libs/threejs/GLTFLoader.js';
import { DRACOLoader } from '../libs/threejs/DRACOLoader.js';
import { RGBELoader } from '../libs/threejs/RGBELoader.js';
import { OrbitControls } from '../libs/threejs/OrbitControls.js';
import { LoadingBar } from '../libs/LoadingBar.js';

class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

		this.assetsPath = '../assets/';
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
		this.camera.position.set(0, 3, 7);
		// this.camera.lookAt(0,1.5,0);
      
		let col = 0x000000;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( col );
		this.scene.fog = new THREE.Fog( 0x000000, 10, 50 );
		
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
		this.scene.add(ambient);



		const dirLight = new THREE.DirectionalLight( 0xffffff );
		dirLight.position.set( - 3, 10, - 10 );
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 1024; 
		dirLight.shadow.mapSize.height = 1024; 
		dirLight.shadow.camera.top = 5;
		dirLight.shadow.camera.bottom = -5;
		dirLight.shadow.camera.left = - 5;
		dirLight.shadow.camera.right = 5;
		dirLight.shadow.camera.near = 0.1;
		dirLight.shadow.camera.far = 80;
		this.scene.add(dirLight);
		// this.scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );
		this.sun = dirLight;

		const plane = new THREE.Mesh( new THREE.PlaneBufferGeometry(200,200 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
		plane.rotation.x = - Math.PI / 2;
		plane.receiveShadow = true;
		this.scene.add(plane);


		this.cube = new THREE.Mesh( new THREE.BoxBufferGeometry(2,2,2), new THREE.MeshStandardMaterial());
		this.cube.receiveShadow = true;
		this.cube.castShadow = true;
		this.cube.position.set(3,3,0);
		this.scene.add(this.cube);

		this.knot = new THREE.Mesh( new THREE.TorusKnotGeometry( 1, 0.3, 100, 16 ), new THREE.MeshNormalMaterial({}));
		this.knot.receiveShadow = true;
		this.knot.castShadow = true;
		this.knot.position.set(-3,3,0)
		this.scene.add(this.knot);


		this.player	= new THREE.Object3D();
		this.scene.add(this.player);

		this.sun.target = this.player;

		const grid = new THREE.GridHelper( 200, 80);
		this.scene.add( grid );
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
       

		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		// this.controls.target.set(0, 1, 0);
		// this.controls.autoRotate = true;
		// this.controls.autoRotateSpeed = 4.0;

        this.loadDino();

		// this.createCameras();

		const btn = document.getElementById('camera-btn');
		btn.addEventListener('click', this.changeCamera.bind(this));
		
		window.addEventListener('resize', this.resize.bind(this) );
		document.addEventListener( 'keydown', this.keyDown.bind(this) );
		document.addEventListener( 'keyup', this.keyUp.bind(this) );
	}
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }



	createCameras(){
		this.cameras = [];
		this.cameraIndex = 0; 

		const followCam = new THREE.Object3D();
		followCam.position.copy(this.camera.position);
		this.player.add(followCam);
		this.cameras.push(followCam);

		const frontCam = new THREE.Object3D();
		frontCam.position.set(0, 3, -7);
		this.player.add(frontCam);
		this.cameras.push(frontCam);

		const overheadCam = new THREE.Object3D();
		overheadCam.position.set(0, 20, 0);
		this.cameras.push(overheadCam);
	}
    
	changeCamera(){
		this.cameraIndex++;
		if (this.cameraIndex >= this.cameras.length) this.cameraIndex = 0;
	}


    loadDino(){
        const loader = new GLTFLoader( ).setPath(`${this.assetsPath}/`);
		const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( '../libs/threejs/draco/' );
        loader.setDRACOLoader( dracoLoader );
        this.loadingBar.visible = true;

		loader.load(
            // resource URL
			'chibiDino-animations-v2.glb',
			// called when the resource is loaded
			gltf => {
                this.scene.add( gltf.scene );
                this.dino = gltf.scene;
				this.mixer = new THREE.AnimationMixer( gltf.scene );

                this.animations = {};

				gltf.animations.forEach( animation => {
					this.animations[animation.name] = animation;
				});

				this.player.add(this.dino);

                this.action = 'breathing';

				this.dino.traverse( child => {
					if (child.isMesh){
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				
                this.loadingBar.visible = false;
                
                this.renderer.setAnimationLoop( this.render.bind(this) );

            },
            xhr => {
                this.loadingBar.progress = (xhr.loaded / xhr.total);
            },
			err => {
				console.error( err );
			}
		);
	}			
    
	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
            if (name==='fall' || name=='fall_flat'){
				action.clampWhenFinished = true;
				action.setLoop( LoopOnce );
			}

			action.reset();
            const nofade = (this.actionName === 'fall' || this.actionName === 'fall_flat'|| this.actionName === 'jump');
			this.actionName = name.toLowerCase();

			action.play();

			if (this.curAction){
				if (nofade){
					this.curAction.enabled = false;
				}else{
					this.curAction.crossFadeTo(action, 0.5);
				}
			}
			this.curAction = action;
		}
	}

	keyDown(evt){
		let forward = ( this.player.userData.move!==undefined) ? this.player.userData.move.forward : 0;
		let turn = (this.player.userData.move!==undefined) ?  this.player.userData.move.turn : 0;
		let jump = (this.player.userData.jump!==undefined) ?  this.player.userData.move.jump : 0;
		
		switch(evt.keyCode){
			case 87://W
				forward = 1;
				break;

			case 83://S
				forward = -1;
				break;

			case 65://A
				turn = 1;
				break;

			case 68://D
				turn = -1;
				break;
				
			case 32:// SPACE
				jump = true;
				break;
		}
		
		this.playerControl(forward, turn, jump);
	}
	  
	keyUp(evt){
		let forward = (this.player.userData.move!==undefined) ? this.player.userData.move.forward : 0;
		let turn = (this.player.userData.move!==undefined) ?  this.player.userData.move.turn : 0;
		let jump = (this.player.userData.jump!==undefined) ?  this.player.userData.move.jump : 0;
		
		switch(evt.keyCode){
		  case 87://W
			forward = 0;
			break;
		  case 83://S
			forward = 0;
			break;
		  case 65://A
			turn = 0;
			break;
		  case 68://D
			turn = 0;
			break;
		case 32:// SPACE
			jump = 0;
			break;
		}
		
		this.playerControl(forward, turn, jump);
	}

	playerControl(forward, turn, jump){
		// console.log(forward, turn, jump);
		if (forward==0 && turn==0 && jump==0){
				delete this.player.userData.move;
		}else{
			if (this.player.userData.move){
				this.player.userData.move.forward = forward;
				this.player.userData.move.turn = turn;
				this.player.userData.move.jump = jump;
			}else{
				this.player.userData.move = { forward, turn, jump, time: this.clock.getElapsedTime(), speed: 1 }; 
				this.cameraIndex = 1;
			}
		}	
	}


	render() {
		const dt = this.clock.getDelta();

        if (this.mixer !== undefined) this.mixer.update(dt);

		if (this.player.userData.move!==undefined){
			if (this.player.userData.move.forward>0 && this.player.userData.move.speed<10) this.player.userData.move.speed += 0.05;

			this.player.translateZ(this.player.userData.move.forward * dt * this.player.userData.move.speed);
			this.player.rotateY(this.player.userData.move.turn * dt);

			if (this.player.userData.move.forward<0){
				this.action = 'back_pedal';
				this.cameraIndex = 0;
			  }else if (this.player.userData.move.forward===0){
				if (this.player.userData.move.turn<0){
					this.action = 'turn_right_in_place';
				}else{
					this.action = 'turn_left_in_place';
				}
			  }else if (this.player.userData.move.speed>5){
				this.action = 'slow_run';
			  }else{
				this.action = 'walk';
			}
		}else{
			this.action = 'breathing';
		}

        this.renderer.render( this.scene, this.camera );

		this.controls.update();




		// this.camera.position.lerp(this.cameras[this.cameraIndex].getWorldPosition(new THREE.Vector3()), 0.05);
		// const pos = this.player.position.clone();
		// pos.y += 3;
		// this.camera.lookAt(pos);

		if (this.sun != undefined){
			this.sun.position.x =  this.player.position.x;
			this.sun.position.y =  this.player.position.y + 10;
			this.sun.position.z =  this.player.position.z - 10;
			this.sun.target = this.player;
		}


		this.cube.rotation.x += 0.03;
		this.cube.rotation.y += 0.03;

		this.knot.rotation.x -= 0.03;
		this.knot.rotation.y -= 0.03;
    }
}

export { Game };