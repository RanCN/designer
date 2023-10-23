/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { EventEmitter } from '@angular/core';
import { BaseControlPoint } from 'app/modules/three-js/objects/control-point';
import { RoadControlPoint } from 'app/modules/three-js/objects/road-control-point';

import { TvAbstractRoadGeometry } from 'app/modules/tv-map/models/geometries/tv-abstract-road-geometry';
import * as THREE from 'three';
import { Vector2, Vector3 } from 'three';
import { SceneService } from '../services/scene.service';
import { AutoSplinePath, ExplicitSplinePath } from './cubic-spline-curve';

export abstract class AbstractSpline {

	abstract type: string;
	public controlPoints: BaseControlPoint[] = [];
	// tcboxgeometry = new THREE.BoxBufferGeometry( 0.7, 0.3, 0.7 );
	protected controlPointAdded = new EventEmitter<BaseControlPoint>();
	protected controlPointRemoved = new EventEmitter<BaseControlPoint>();
	protected meshAddedInScene: boolean;

	constructor ( public closed = true, public tension = 0.5 ) {

		this.init();

	}

	get controlPointPositions (): Vector3[] {
		return this.controlPoints.map( point => point.position );
	}

	abstract init (): void;

	abstract hide (): void;

	abstract show (): void;

	abstract hideLines (): void;

	abstract showLines (): void;

	abstract update (): void;

	abstract exportGeometries ( duringImport?: boolean ): TvAbstractRoadGeometry[];

	abstract getPoint ( t: number, offset: number ): Vector3;

	abstract getLength (): number;

	clear () {

		throw new Error( 'Method not implemented.' );

	}

	addControlPoint ( cp: BaseControlPoint ) {

		this.controlPoints.push( cp );

	}

	addControlPoints ( points: BaseControlPoint[] ): void {

		points.forEach( point => this.addControlPoint( point ) );

	}

	addControlPointAtNew ( position: Vector3 ): RoadControlPoint {

		throw new Error( 'method not implemented' );

	}

	getFirstPoint () {

		return this.controlPoints[ 0 ];

	}

	getSecondPoint () {

		try {

			return this.controlPoints[ 1 ];

		} catch ( error ) {

		}

	}

	getLastPoint () {

		return this.controlPoints[ this.controlPoints.length - 1 ];

	}

	getSecondLastPoint () {

		try {

			return this.controlPoints[ this.controlPoints.length - 2 ];

		} catch ( error ) {

		}

	}

	removeControlPoint ( cp: BaseControlPoint ) {

		const index = this.controlPoints.findIndex( p => p.id === cp.id );

		this.controlPoints.splice( index, 1 );
	}

	hideControlPoints () {
		this.controlPoints.forEach( i => i.hide() );
	}

	showControlPoints () {
		this.controlPoints.forEach( i => i.show() );
	}

	getArcParams ( p1: Vector2, p2: Vector2, dir1: Vector2, dir2: Vector2 ): number[] {

		const distance = p1.distanceTo( p2 );

		const normalisedDotProduct = new THREE.Vector2()
			.copy( dir1 )
			.normalize()
			.dot( new THREE.Vector2().copy( dir2 ).normalize() );

		const alpha = Math.acos( normalisedDotProduct );

		const r = distance / 2 / Math.sin( alpha / 2 );

		const length = r * alpha;

		const ma = dir1.x, mb = dir1.y, mc = -mb, md = ma;

		const det = 1 / ( ma * md - mb * mc );

		const mia = det * md, mib = -mb * det, mic = -mc * det, mid = ma * det;

		const p2proj = new THREE.Vector2().subVectors( p2, p1 );

		p2proj.set( p2proj.x * mia + p2proj.y * mic, p2proj.x * mib + p2proj.y * mid );

		return [ r, alpha, length, Math.sign( p2proj.y ) ];
	}

	updateControlPoint ( cp: BaseControlPoint, id: number, cpobjidx?: any ) {

		cp[ 'tag' ] = 'cp';
		cp[ 'tagindex' ] = id;

		cp.userData.is_button = true;
		cp.userData.is_control_point = true;
		cp.userData.is_selectable = true;

		if ( cpobjidx == undefined ) {
			this.controlPoints.push( cp );
		} else {
			this.controlPoints.splice( cpobjidx, 0, cp );
		}
	}

	/**
	 *
	 * @deprecated dont use this make another internal for any sub class
	 * @param tag
	 * @param id
	 * @param cpobjidx
	 */
	createControlPoint ( tag: 'cp' | 'tpf' | 'tpb', id: number, cpobjidx?: any ): BaseControlPoint {

		// let cptobj = new THREE.Mesh( this.tcboxgeometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
		let controlPointObject = new RoadControlPoint( null, new Vector3(), tag, id, cpobjidx );

		controlPointObject[ 'tag' ] = tag;
		controlPointObject[ 'tagindex' ] = id;

		controlPointObject.userData.is_button = true;
		controlPointObject.userData.is_control_point = true;
		controlPointObject.userData.is_selectable = true;

		SceneService.addToolObject( controlPointObject );

		if ( cpobjidx == undefined ) {
			this.controlPoints.push( controlPointObject );
		} else {
			this.controlPoints.splice( cpobjidx, 0, controlPointObject );
		}

		this.controlPointAdded.emit( controlPointObject );

		return controlPointObject;
	}

	getPath ( offset: number ) {
		if ( this.type == 'auto' ) {
			return new AutoSplinePath( this as any, offset );
		} else if ( this.type == 'explicit' ) {
			return new ExplicitSplinePath( this as any, offset );
		}
	}

	getPoints ( step: number ) {

		const points: Vector3[] = [];

		const length = this.getLength();

		const d = step / length;

		for ( let i = 0; i <= 1; i += d ) {

			points.push( this.getPoint( i, 0 ) );

		}

		return points;
	}

}


