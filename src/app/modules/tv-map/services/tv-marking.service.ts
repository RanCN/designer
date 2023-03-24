/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { EventEmitter } from '@angular/core';
import { GameObject } from 'app/core/game-object';
import { AssetDatabase } from 'app/services/asset-database';
import * as THREE from 'three';
import { Mesh, PlaneGeometry, Shape, Texture } from 'three';

export enum MarkingTypes {
	point = 'point',
	curve = 'curve',
}

export class TvRoadMarking {

	public static extension = 'roadmarking';

	public static tag = 'roadmarking';

	public mesh: Mesh;

	constructor ( public name: string, public type: MarkingTypes, public textureGuid: string ) {

		this.mesh = this.makeMesh( new Shape() );

	}

	static new (): TvRoadMarking {

		return new TvRoadMarking( 'NewRoadMarking', MarkingTypes.point, null );

	}

	static importFromString ( contents: string ): TvRoadMarking {

		const json = JSON.parse( contents );

		return new TvRoadMarking( json.name, json.type, json.textureGuid );

	}

	makeMesh ( shape: Shape ): Mesh {

		const geometry = new PlaneGeometry();

		const texture = AssetDatabase.getInstance<Texture>( this.textureGuid );

		// texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		// texture.repeat.set( 0.008, 0.008 );
		// texture.anisotropy = 16;
		// texture.encoding = THREE.sRGBEncoding;>

		const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, alphaTest: 0.1 } );

		const mesh = new GameObject( this.name, geometry, material );

		mesh.position.set( 0, 0, 0.01 );

		mesh.Tag = TvRoadMarking.tag;

		mesh.userData.roadmarking = this;

		return mesh;
	}


	toJSONString (): any {

		return JSON.stringify( {
			name: this.name,
			type: this.type,
			textureGuid: this.textureGuid,
		}, null, 2 );
	}

	clone () {

		return new TvRoadMarking( this.name, this.type, this.textureGuid );

	}

}


export class TvMarkingService {

	public static markingChanged = new EventEmitter<TvRoadMarking>();

	private static selectedMarking: TvRoadMarking;

	static get currentMarking () {

		return this.selectedMarking;

	}

	static set currentMarking ( value ) {

		this.selectedMarking = value;

		this.markingChanged.emit( value );

	}
}
