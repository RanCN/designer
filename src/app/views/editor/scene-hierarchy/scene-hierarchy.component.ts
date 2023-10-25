import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatTreeFlattener, MatTreeFlatDataSource } from '@angular/material/tree';
import { SceneService } from 'app/core/services/scene.service';
import { Subscription } from 'rxjs';
import { Object3D } from 'three';

class FlatNode extends Object3D {
	expandable: boolean;
	name: string;
	level: number;
	object: Object3D;
}

@Component( {
	selector: 'app-scene-hierarchy',
	templateUrl: './scene-hierarchy.component.html',
	styleUrls: [ './scene-hierarchy.component.scss' ]
} )
export class SceneHierarchyComponent implements OnInit, OnDestroy {

	transformer = ( node: Object3D, level: number ) => {
		return {
			id: node.id,
			uuid: node.uuid,
			name: node.id + ':' + node.name + ':' + node.type,
			type: node.type,
			children: node.children,
			expandable: !!node.children && node.children.length > 0,
			level: level,
			object: node,
		};
	};
	treeFlattener = new MatTreeFlattener( this.transformer, node => node.level, node => node.expandable, node => node.children );
	treeControl = new FlatTreeControl<FlatNode>( node => node.level, node => node.expandable );
	dataSource = new MatTreeFlatDataSource( this.treeControl, this.treeFlattener );

	private sceneChangedSubscription: Subscription;
	private debug = true;

	private timeoutId: any = null;
	private readonly debounceDuration = 100; // duration in milliseconds

	constructor ( private changeDet: ChangeDetectorRef ) { }

	hasChild = ( _: number, node: FlatNode ) => node.expandable;

	generateTreeData ( object3d: THREE.Object3D ): Object3D[] {
		// Convert the object and its children to a tree node
		const treeNode: Object3D = object3d;

		return [ treeNode ];
	}

	ngOnInit (): void {

		this.dataSource.data = this.generateTreeData( SceneService.scene );

		this.sceneChangedSubscription = SceneService.changed.subscribe( () => {

			// If there's a pending execution, cancel it
			if ( this.timeoutId ) {
				clearTimeout( this.timeoutId );
			}

			// Schedule a new execution
			this.timeoutId = setTimeout( () => {

				this.onSceneChanged();

			}, this.debounceDuration );

		} );

	}

	onSceneChanged (): void {

		this.dataSource.data = this.generateTreeData( SceneService.scene );

		this.changeDet.detectChanges();

		if ( this.debug ) console.log( 'SceneHierarchyComponent.onSceneChanged', SceneService.scene );

	}

	ngOnDestroy (): void {

		this.sceneChangedSubscription?.unsubscribe();

	}

	onNodeClicked ( node: FlatNode ) {

		console.log( 'node clicked', node );

	}
}
