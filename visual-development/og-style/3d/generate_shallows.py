import bpy, math, os
from mathutils import Vector
from math import pi
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'shallows-level-01')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
base=bpy.data.collections.get('Collection'); base.name='Scene'
def mat(name,color,metal=0,rough=.45):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 return m
sand=mat('warm sand',(.77,.65,.40)); rock=mat('deep teal rock',(.035,.23,.25)); yellow=mat('golden yellow', (1,.52,.025)); cream=mat('warm ivory',(.84,.78,.60)); navy=mat('deep navy',(.025,.12,.16),.25); cyan=mat('turquoise glass',(.015,.72,.78),.15,.2); steel=mat('steel',(.25,.40,.42),.55); sea=mat('sea',(.015,.19,.24)); green=mat('seaweed',(.035,.30,.23)); light=mat('lamp', (1,.8,.37))
collections={}
def coll(name):
 c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); collections[name]=c; return c
def move(obj, group, material):
 for c in list(obj.users_collection): c.objects.unlink(obj)
 collections[group].objects.link(obj)
 if material: obj.data.materials.append(material)
 return obj
def smooth(o):
 if o.type=='MESH':
  for p in o.data.polygons: p.use_smooth=True
 return o
def bevel(o, amount=.12, segments=3):
 mod=o.modifiers.new('Soft edges','BEVEL'); mod.width=amount; mod.segments=segments
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); mod.keep_sharp=True
 return o
def box(name,loc,scale,material,group,rounding=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); move(o,group,material)
 if rounding: bevel(o,rounding)
 return o
def cylinder(name,loc,r,depth,material,group,axis='Z',vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); o=bpy.context.object; o.name=name
 if axis=='X': o.rotation_euler[1]=pi/2
 if axis=='Y': o.rotation_euler[0]=pi/2
 move(o,group,material); bevel(o,.045,3); smooth(o); return o
def sphere(name,loc,scale,material,group):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; move(o,group,material); smooth(o); return o
def cone(name,loc,r1,r2,depth,material,group,axis='Z'):
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r1,radius2=r2,depth=depth,location=loc); o=bpy.context.object; o.name=name
 if axis=='Y': o.rotation_euler[0]=pi/2
 move(o,group,material); smooth(o); return o
for n in ['Island','Drill','Refinery','Storage','Submarine']: coll(n)
# The five assets share one consistent world scale and camera angle.
# Broad, deliberately simple platform.
island=cylinder('Rock foundation',(0,1,-.62),3.0,1.15,rock,'Island',vertices=12); island.scale.y=.62
cylinder('Sandy top',(0,1,-.015),2.97,.18,sand,'Island',vertices=12).scale.y=.62
for x,y in [(-2.35,1.9),(2.3,1.7)]:
 for dx,h in [(-.12,.42),(.12,.62)]: sphere('Seaweed',(x+dx,y,.19+h/2),(.08,.08,h/2),green,'Island')
# Drill, aimed towards the viewer.
box('Drill housing',(-1.6,.95,.70),(1.0,.95,.85),yellow,'Drill',.18)
for x in [-1.98,-1.22]:
 box('Drill support',(x,.95,.27),(.12,1.18,.18),navy,'Drill',.04)
 box('Support upright',(x,1.17,.49),(.12,.12,.48),navy,'Drill',.04)
cylinder('Drill collar',(-1.6,.40,.69),.35,.22,navy,'Drill','Y')
cylinder('Drill spindle',(-1.6,.24,.69),.26,.23,steel,'Drill','Y')
cone('Drill bit',(-1.6,.02,.69),.22,0,.45,steel,'Drill','Y')
box('Drill indicator',(-1.6,.458,.83),(.25,.04,.12),cyan,'Drill',.02)
# Refinery: one clean cylindrical tank and a single pipe.
cylinder('Refinery base',(.05,1.30,.14),.65,.23,navy,'Refinery')
cylinder('Refinery tank',(.05,1.30,.82),.58,1.25,cream,'Refinery')
cylinder('Refinery glass',(.05,1.30,.83),.595,.57,cyan,'Refinery')
cylinder('Refinery lid',(.05,1.30,1.49),.59,.17,cream,'Refinery')
cylinder('Refinery pipe',(.79,1.30,.41),.12,.56,steel,'Refinery')
cylinder('Refinery pipe connection',(.62,1.30,.68),.12,.35,steel,'Refinery','X')
sphere('Pipe elbow',(.79,1.30,.68),(.12,.12,.12),steel,'Refinery')
# Warehouse with readable doorway.
box('Storage building',(1.65,.95,.56),(1.15,1.0,1.05),cream,'Storage',.14)
box('Storage foundation',(1.65,.95,.12),(1.27,1.1,.16),navy,'Storage',.07)
box('Golden roof',(1.65,.95,1.11),(1.22,1.08,.29),yellow,'Storage',.14)
box('Door frame',(1.65,.425,.51),(.58,.08,.69),navy,'Storage',.07)
box('Door opening',(1.65,.375,.49),(.43,.04,.55),navy,'Storage',.03)
box('Cargo',(1.65,.30,.29),(.26,.24,.27),yellow,'Storage',.025)
# Submarine occupies its own clear space forward of the base.
# Nose points toward camera; rotor and hull are separate editable parts.
sx,sy=-.95,-2.2
sphere('Submarine hull',(sx,sy,.62),(.63,.95,.59),cream,'Submarine')
cylinder('Nose rim',(sx,sy-.67,.62),.55,.24,yellow,'Submarine','Y')
cylinder('Window frame',(sx,sy-.81,.62),.46,.12,navy,'Submarine','Y')
cylinder('Cyan window',(sx,sy-.89,.62),.40,.08,cyan,'Submarine','Y')
cylinder('Rear propeller shroud',(sx,sy+.91,.62),.39,.19,yellow,'Submarine','Y')
cylinder('Propeller hub',(sx,sy+1.04,.62),.12,.12,navy,'Submarine','Y')
for angle in (0,pi/2):
 o=box('Propeller blade',(sx,sy+1.07,.62),(.59,.06,.10),navy,'Submarine',.04); o.rotation_euler[1]=angle
box('Top fin',(sx,sy+.30,1.22),(.20,.42,.35),yellow,'Submarine',.08)
for x in [sx-.66,sx+.66]:
 box('Side fin',(x,sy+.15,.43),(.50,.45,.09),yellow,'Submarine',.06)
for x in [sx-.43,sx+.43]:
 cylinder('Lamp housing',(x,sy-.70,.27),.16,.21,navy,'Submarine','Y')
 cylinder('Lamp lens',(x,sy-.82,.27),.12,.05,light,'Submarine','Y')
# Scene staging, excluded from individual model exports.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.25)); o=bpy.context.object; o.name='Ocean backdrop'; o.data.materials.append(sea)
world=bpy.context.scene.world; world.color=(.04,.12,.14)
world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.025,.12,.16,1); world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.object.light_add(type='AREA',location=(-3,-5,9)); bpy.context.object.data.energy=1400; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=8
bpy.ops.object.light_add(type='AREA',location=(4,4,7)); bpy.context.object.data.energy=900; bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(8,-12,9)); cam=bpy.context.object; cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=9.2; bpy.context.scene.camera=cam
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.render.resolution_x=1200; scene.render.resolution_y=850; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'; scene.render.image_settings.file_format='PNG'; scene.render.filepath=os.path.join(OUT,'preview.png')
# Save the complete editable assembly, then export independent GLBs with local origins.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shallows-scene.blend'))
for group,c in collections.items():
 bpy.ops.object.select_all(action='DESELECT')
 objs=list(c.objects)
 # Keep the individual assets centered in XY, but preserve their ground height.
 center=sum((o.location for o in objs),Vector())/len(objs)
 shift=Vector((center.x,center.y,0))
 for o in objs: o.location-=shift; o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,group.lower()+'.glb'),export_format='GLB',use_selection=True)
 for o in objs: o.location+=shift
bpy.ops.object.select_all(action='DESELECT')
scene.render.filepath=os.path.join(OUT,'preview.png'); bpy.ops.render.render(write_still=True)
