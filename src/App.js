import React, { Component } from "react";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SepiaShader } from 'three/examples/jsm/shaders/SepiaShader.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import './App.css'
import Overlay from './Overlay.js'

import metalBallMatcap from './blue.jpg'

function vertexShader() {
	return `
	varying vec2 vUv; 

	void main() {
	vUv = position.xy; 

	vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * modelViewPosition; 
	}
	`
  }
function fragmentShader(){
return `
uniform vec3 colorA; 
uniform vec3 colorB; 
uniform vec4 resolution;
uniform sampler2D metalBallMatcap;
uniform float time;
varying vec2 vUv;
float PI = 3.14159265359;

float sdSphere(vec3 p, float r){
	return length(p) - r;
}
float smin( float a, float b, float k )
{
    float h = max( k-abs(a-b), 0.0 )/k;
    return min( a, b ) - h*h*k*(1.0/4.0);
}
float sdf(vec3 p){
	float sphere = sdSphere(p,0.3 + 0.05*smoothstep(-1.0,1.0,abs(sin(time*2.5 + (vUv.y*15.)*2.*PI))));
	float sphere2 = sdSphere(p-vec3(.3),0.3);
	float final = smin(sphere,sphere2,.25);
	for(float i=0.;i<20.;i++){
		vec3 spherePos = vec3(0.,-1. * i/20. - 0.05*(time - floor(time)),0.);
		float curSphere = sdSphere(p-spherePos,0.01);
		final = smin(final,curSphere,0.05);
	}
	return final;
}
vec2 getmatcap(vec3 eye, vec3 normal) {
  vec3 reflected = reflect(eye, normal);
  float m = 2.8284271247461903 * sqrt( reflected.z+1.0 );
  return reflected.xy / m + 0.5;
}
vec3 calcNormal( vec3 p ) // for function f(p)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(sdf(p+h.xyy) - sdf(p-h.xyy),
                           sdf(p+h.yxy) - sdf(p-h.yxy),
                           sdf(p+h.yyx) - sdf(p-h.yyx) ) );
}
void main() {
	float dist = length(vUv);
	vec3 bg = mix(vec3(0.3),vec3(0.),dist);
	vec3 cameraPos = vec3(0.,0.,2.);	
	vec3 ray = normalize(vec3((vUv)*resolution.zw,-1));
	vec3 rayPos = cameraPos;
	float t = 0.0;
	float tMax = 5.0;
	for(int i=0;i<512;i++){
		vec3 pos = cameraPos + t*ray;
		float h = sdf(pos);
		if(h<0.00001 || t>tMax) break;
		t+=h;
	}
	vec3 color = vec3(bg);
	if(t<tMax) {
		vec3 pos = cameraPos + t*ray;
		color = vec3(1.);
		vec3 normal = calcNormal(pos);
		color = normal;
		float diff = dot(vec3(.5),normal);

		vec2 matcapUV = getmatcap(ray, normal);
		color = (texture2D(metalBallMatcap,matcapUV).rgb);

		float fresnel =pow(1. + dot(ray,normal),3.); 
		color = mix(color,bg,fresnel);
	}
  	gl_FragColor = vec4(color, 1.0);
}
`
}

class App extends Component {
	state = { width: window.innerWidth, height: window.innerHeight, then: 0 };
	
	updateUniform = () => {
		this.imageAspect = 1;
		let a1;
		let a2;
		if(this.state.height/this.state.width>this.imageAspect){
			a1 = (this.state.width/this.state.height) * this.imageAspect;
			a2 = 1;
		}  else {
			a1 = 1;
			a2 = (this.state.height/this.state.width) / this.imageAspect;
		}
		this.material.uniforms.resolution.value.x = this.state.width;
		this.material.uniforms.resolution.value.y = this.state.height;
		this.material.uniforms.resolution.value.z = a1;
		this.material.uniforms.resolution.value.w = a2;
	}

	updateDimensions = () => {
		this.setState({ width: window.innerWidth, height: window.innerHeight });
		this.camera.aspect = 1;
  		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.updateUniform();
		this.camera.updateProjectionMatrix();
	};
	componentDidMount() {
		this.setState({ then:Date.now() });
		window.addEventListener('resize', this.updateDimensions);
		var width = this.state.width
    	var height = this.state.height
		var frustumSize = 1
		this.scene = new THREE.Scene()
		//this.camera = new THREE.PerspectiveCamera(
		//	75,
		//	width / height,
		//	0.1,
		//	1000
		//  )
		this.camera = new THREE.OrthographicCamera(frustumSize / -2,frustumSize/2,frustumSize/2,frustumSize/-2,-1000,1000)
		this.camera.position.z = 4
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setClearColor('#000000')
		this.renderer.setSize(width, height)
		this.mount.appendChild(this.renderer.domElement)
		this.time = 0
		this.geometry = new THREE.PlaneGeometry(width, height)
    	//const material = new THREE.MeshBasicMaterial({ color: '#ffff00' })

		this.material = new THREE.ShaderMaterial({
				uniforms: {
					time: { value: 1.0 },
					metalBallMatcap : {value : new THREE.TextureLoader().load(metalBallMatcap)},
					resolution: { value: new THREE.Vector4() },
					colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
					colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)}
				},
				fragmentShader: fragmentShader(),
    			vertexShader: vertexShader()
		})
		
		this.updateUniform();
		this.clock =  new THREE.Clock();
		this.plane = new THREE.Mesh(this.geometry, this.material)
    	this.scene.add(this.plane)

		this.composer = new EffectComposer(this.renderer);
		var renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(renderPass);

		var hblur = new ShaderPass(HorizontalBlurShader)
		this.composer.addPass( hblur );
		var vblur = new ShaderPass( VerticalBlurShader );
		this.composer.addPass( vblur );
		var sepiaPass = new ShaderPass(SepiaShader);
		this.composer.addPass(sepiaPass);
		
		this.start()
	}
	updateComposer(){
		var composer = new EffectComposer(this.renderer);
		var renderPass = new RenderPass(this.scene, this.camera);
		composer.addPass(renderPass);
		var hblur = new ShaderPass( HorizontalBlurShader );
		hblur.uniforms.h.value = 1.0/512.0 * (4.0 - this.clock.elapsedTime);
		composer.addPass( hblur );
		var vblur = new ShaderPass( VerticalBlurShader );
		vblur.uniforms.v.value = 1.0/512.0 * (4.0 - this.clock.elapsedTime);
		composer.addPass( vblur );
		var sepiaPass = new ShaderPass(SepiaShader);
		composer.addPass(sepiaPass);

		this.composer = composer
	}
	componentWillUnmount(){
		this.stop()
		window.removeEventListener('resize', this.updateDimensions);
		this.mount.removeChild(this.renderer.domElement)
	}
	start = () => {
		if (!this.frameId) {
		  this.frameId = requestAnimationFrame(this.animate)
		}
	}
	stop = () => {
		cancelAnimationFrame(this.frameId)
	}
	animate = () => {
		this.material.uniforms.time.value = this.clock.getElapsedTime();
		this.renderScene()
		this.frameId = window.requestAnimationFrame(this.animate)
	}
	renderScene = () => {
		if(this.clock.elapsedTime < 4.0 )
			this.updateComposer();
		this.composer.render();
	}
	render() {
	  return (
		  <div>
		  <Overlay/>
		<div
			ref={ref => (this.mount = ref)} 
		/>
		</div>
	  )
	}
}
export default App