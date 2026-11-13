import bpy, math, os, json
from mathutils import Vector, Matrix
from math import pi
ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'shallows-level-01-v10')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
base=bpy.data.collections.get('Collection'); base.name='Scene'
def mat(name,color,metal=0,rough=.45):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 return m
sand=mat('warm sand',(.83,.64,.32)); rock=mat('deep teal rock',(.012,.19,.23)); yellow=mat('golden yellow', (1,.53,.012),0,.33); cream=mat('warm ivory',(.94,.79,.53)); navy=mat('deep navy',(.025,.12,.16),.25); cyan=mat('turquoise glass',(.002,.46,.56),.08,.13); cyan.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.0,.38,.46,1); cyan.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.32; steel=mat('steel',(.25,.40,.42),.55); sea=mat('sea',(.008,.10,.15)); green=mat('seaweed',(.035,.30,.23)); light=mat('lamp', (1,.8,.37)); light.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(1,.58,.15,1); light.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=1.2
glass=cyan.node_tree.nodes['Principled BSDF']
glass.inputs['Coat Weight'].default_value=.4; glass.inputs['Coat Roughness'].default_value=.1; glass.inputs['IOR'].default_value=1.46
# Gentle view-dependent turquoise lens color, with a glossy clear coating.
nt=cyan.node_tree; facing=nt.nodes.new('ShaderNodeLayerWeight'); facing.inputs['Blend'].default_value=.35
ramp=nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(.001,.63,.69,1); ramp.color_ramp.elements[1].color=(.001,.30,.42,1); nt.links.new(facing.outputs['Facing'],ramp.inputs[0]); nt.links.new(ramp.outputs['Color'],glass.inputs['Base Color'])
collections={}
def coll(name):
 c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); collections[name]=c; return c
def move(obj, group, material):
 if group is None:
  if material:obj.data.materials.append(material)
  return obj
 for c in list(obj.users_collection): c.objects.unlink(obj)
 collections[group].objects.link(obj)
 if material: obj.data.materials.append(material)
 return obj
def smooth(o):
 if o.type=='MESH':
  for p in o.data.polygons: p.use_smooth=True
 return o
def bevel(o, amount=.12, segments=3):
 mod=o.modifiers.new('Soft edges','BEVEL'); mod.width=amount; mod.segments=max(segments,5); mod.harden_normals=True
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); mod.keep_sharp=True
 return o
def box(name,loc,scale,material,group,rounding=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); move(o,group,material)
 if rounding: bevel(o,rounding); smooth(o)
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
# An irregular triangulated rocky island, with a separate rounded sandy cap.
import random
random.seed(9)
N=32
verts=[]
for layer in range(4):
 for i in range(N):
  angle=2*pi*i/N; jitter=1+.045*math.sin(angle*5+.3)+.025*math.sin(angle*9)+random.uniform(-.012,.012)
  rx=[3.12,3.16,3.02,2.30][layer]*jitter; ry=[1.65,1.72,1.61,1.17][layer]*jitter
  z=[.02,-.28,-1.12,-1.78][layer]+random.uniform(-.05,.05)+(math.sin(angle*5)*.18 if layer==3 else 0)
  verts.append((rx*math.copysign(abs(math.cos(angle))**.90,math.cos(angle)),1+ry*math.copysign(abs(math.sin(angle))**.90,math.sin(angle)),z))
faces=[]
for l in range(3):
 for i in range(N):
  a=l*N+i; b=l*N+(i+1)%N; c=(l+1)*N+i; d=(l+1)*N+(i+1)%N
  faces.extend([(a,b,c),(b,d,c)])
faces.append(tuple(range(3*N,4*N)))
mesh=bpy.data.meshes.new('faceted cliff mesh'); mesh.from_pydata(verts,[],faces); mesh.update()
o=bpy.data.objects.new('Faceted rocky island',mesh); bpy.context.scene.collection.objects.link(o); move(o,'Island',rock)
sandverts=[(0,1,.07)]
for ring in range(1,6):
 t=ring/5
 for x,y,z in verts[:N]:
  xx=x*t; yy=1+(y-1)*t
  sandverts.append((xx,yy,.07+.018*math.sin(xx*3+yy)*math.sin(yy*4)+.012*math.cos(xx*5-yy)))
sandfaces=[]
for i in range(N):sandfaces.append((0,1+i,1+(i+1)%N))
for ring in range(4):
 for i in range(N):
  a=1+ring*N+i;b=1+ring*N+(i+1)%N;c=a+N;d=b+N
  sandfaces.extend([(a,c,d),(a,d,b)])
sandmesh=bpy.data.meshes.new('gently rippled sand mesh'); sandmesh.from_pydata(sandverts,[],sandfaces); sandmesh.update()
o=bpy.data.objects.new('Sandy island top',sandmesh); bpy.context.scene.collection.objects.link(o); move(o,'Island',sand);smooth(o)
solid=o.modifiers.new('Sand thickness','SOLIDIFY'); solid.thickness=.12
bevel(o,.035,3)
def branch(name, points, radius, material, group=None):
 c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=radius; c.bevel_resolution=4; c.resolution_u=16; c.use_fill_caps=True
 sp=c.splines.new('BEZIER'); sp.bezier_points.add(len(points)-1)
 for i,(b,p) in enumerate(zip(sp.bezier_points,points)):
  b.co=p; b.handle_left_type='AUTO'; b.handle_right_type='AUTO'; b.radius=1-.32*i/max(1,len(points)-1)
 o=bpy.data.objects.new(name,c); bpy.context.scene.collection.objects.link(o)
 if group: move(o,group,material)
 else: c.materials.append(material)
 # Rounded organic tips, visible from every angle.
 for index,endpoint in enumerate((points[0],points[-1])):
  tip=radius*(1 if index==0 else .64); sphere(name+' rounded tip',endpoint,(tip,tip,tip),material,group)
 return o
# Distinct low-poly stones and tall organic kelp echo the reference.
for x,y,size in [(-2.5,.45,.20),(-1.45,-.25,.28),(1.5,-.27,.31),(2.48,1.45,.18)]:
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=size,location=(x,y,.14)); move(bpy.context.object,'Island',rock); bpy.context.object.name='Faceted stone'
for x,y in [(-2.3,2.0),(.9,2.35),(1.55,2.25),(2.55,1.45)]:
 branch('Kelp stem',[(x,y,.08),(x-.04,y,.33),(x+.03,y,.62),(x,y,.87)],.07,green,'Island')
 for sign in [-1,1]:
  branch('Kelp branch',[(x,y,.20),(x+sign*.16,y,.32),(x+sign*.22,y,.53),(x+sign*.18,y,.64)],.055,green,'Island')
# Drill, aimed towards the viewer.
box('Drill housing',(-1.6,.95,.70),(1.0,.95,.85),yellow,'Drill',.18)
for x in [-1.98,-1.22]:
 box('Drill support',(x,.95,.27),(.12,1.18,.18),navy,'Drill',.04)
 box('Support upright',(x,1.17,.49),(.12,.12,.48),navy,'Drill',.04)
cylinder('Drill collar',(-1.6,.40,.69),.35,.22,navy,'Drill','Y')
cylinder('Drill spindle',(-1.6,.24,.69),.26,.23,steel,'Drill','Y')
cone('Drill bit',(-1.6,-.08,.69),.22,0,.56,steel,'Drill','Y')
# Fine concentric seams articulate the conical metal drill tip.
seam=mat('Bit seams',(.13,.25,.28),.45,.33)
for yy,rr in [(.08,.173),(-.10,.103)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=rr,minor_radius=.006,major_segments=48,minor_segments=6,location=(-1.6,yy,.69),rotation=(pi/2,0,0));move(bpy.context.object,'Drill',seam);smooth(bpy.context.object)
box('Drill indicator bezel',(-1.085,.93,.85),(.04,.29,.17),navy,'Drill',.02)
box('Drill indicator',(-1.057,.93,.85),(.025,.21,.10),cyan,'Drill',.02)
for x in [-2.0,-1.2]:
 for y in [.43,1.47]: box('Drill foot',(x,y,.15),(.22,.25,.11),navy,'Drill',.025)
for x in [-1.99,-1.21]:
 o=box('Angled support',(x,1.25,.49),(.10,.11,.55),navy,'Drill',.03); o.rotation_euler[0]=-.35
# Uprights at the front and diagonal braces make the frame readable.
for x in [-1.99,-1.21]:
 box('Front upright',(x,.53,.49),(.12,.12,.53),navy,'Drill',.025)
 brace=box('Diagonal frame brace',(x,.90,.34),(.09,.78,.09),navy,'Drill',.02); brace.rotation_euler[0]=.38
for y,r in [(.27,.25),(.14,.20)]: cylinder('Drill metal ring',(-1.6,y,.69),r,.07,steel,'Drill','Y')
# Refinery: one clean cylindrical tank and a single pipe.
cylinder('Refinery base',(.05,1.30,.14),.65,.23,navy,'Refinery')
cylinder('Refinery tank',(.05,1.30,.82),.58,1.25,cream,'Refinery')
# Front-facing inset glass window, framed by pale tank, rather than a full stripe.
# A curved glass inset follows the tank's cylindrical surface.
def curved_window(name,r,zlo,zhi,half,material):
 v=[]; faces=[]; steps=24
 for z in (zlo,zhi):
  for i in range(steps+1):
   a=-half+2*half*i/steps; v.append((.05+r*math.sin(a),1.30-r*math.cos(a),z))
 for i in range(steps): faces.append((i,i+1,steps+2+i,steps+1+i))
 m=bpy.data.meshes.new(name); m.from_pydata(v,[],faces); m.update(); o=bpy.data.objects.new(name,m); bpy.context.scene.collection.objects.link(o); move(o,'Refinery',material); smooth(o)
curved_window('Window dark border',.593,.47,1.19,.80,navy)
curved_window('Window turquoise glass',.600,.52,1.14,.73,cyan)
cylinder('Refinery lid',(.05,1.30,1.49),.59,.17,cream,'Refinery')
sphere('Rounded refinery crown',(.05,1.30,1.56),(.52,.52,.15),cream,'Refinery')
# Pipe is deliberately positioned on the visible right-hand side of the tank.
cylinder('Pipe foot',(.88,.68,.18),.19,.18,navy,'Refinery')
cylinder('Refinery pipe',(.88,.68,.42),.12,.54,steel,'Refinery')
cylinder('Pipe top connector',(.71,.68,.70),.12,.36,steel,'Refinery','X')
sphere('Pipe elbow',(.88,.68,.69),(.13,.13,.13),steel,'Refinery')
cylinder('Pipe collar',(.61,.68,.70),.17,.10,navy,'Refinery','X')
branch('Tank connected outlet',[(.44,.94,.70),(.55,.80,.70),(.71,.68,.70)],.12,steel,'Refinery')
for z in [.26,.43]: cylinder('Pipe joint',(.88,.68,z),.125,.05,navy,'Refinery')
# Warehouse with readable doorway.
# Open doorway: build walls as separate meshes so cargo actually sits inside.
box('Storage back wall',(1.65,1.39,.58),(1.15,.12,.98),cream,'Storage',.06)
box('Storage left wall',(1.12,.95,.58),(.13,.92,.98),cream,'Storage',.06)
box('Storage right wall',(2.18,.95,.58),(.13,.92,.98),cream,'Storage',.06)
box('Storage front left',(1.25,.48,.58),(.35,.15,.98),cream,'Storage',.06)
box('Storage front right',(2.05,.48,.58),(.35,.15,.98),cream,'Storage',.06)
box('Storage front lintel',(1.65,.48,.94),(.62,.15,.24),cream,'Storage',.06)
box('Storage dark interior',(1.65,1.30,.49),(.85,.05,.75),navy,'Storage',.02)
box('Storage foundation',(1.65,.95,.12),(1.27,1.1,.16),navy,'Storage',.07)
# Barrel-shaped garage roof, extruded along the depth of the building.
roofverts=[]; roof_faces=[]; steps=16
for y in (.38,1.52):
 for i in range(steps+1):
  t=-pi/2+pi*i/steps; roofverts.append((1.65+.62*math.sin(t),y,1.03+.29*math.cos(t)))
for i in range(steps): roof_faces.append((i,i+1,steps+2+i,steps+1+i))
roof_faces.extend([tuple(range(steps,-1,-1)),tuple(range(steps+1,2*(steps+1)))])
m=bpy.data.meshes.new('Curved roof mesh'); m.from_pydata(roofverts,[],roof_faces); m.update(); o=bpy.data.objects.new('Curved golden roof',m); bpy.context.scene.collection.objects.link(o); move(o,'Storage',yellow); solid=o.modifiers.new('Roof thickness','SOLIDIFY'); solid.thickness=.06; bevel(o,.045,3); smooth(o)
for dx in [-.31,.31]: box('Door jamb',(1.65+dx,.385,.48),(.09,.12,.70),navy,'Storage',.035)
box('Door frame header',(1.65,.385,.81),(.68,.12,.12),navy,'Storage',.04)
box('Door top shutter',(1.65,.345,.72),(.41,.035,.10),yellow,'Storage',.02)
for x in [1.22,2.08]:
 box('Storage indicator bezel',(x,.435,.55),(.11,.06,.27),navy,'Storage',.02)
 box('Storage indicator',(x,.395,.55),(.055,.025,.19),cyan,'Storage',.015)
box('Cargo',(1.65,.50,.29),(.34,.32,.33),yellow,'Storage',.025)
box('Cargo strap',(1.65,.331,.29),(.045,.018,.33),navy,'Storage',.005)
box('Cargo top strap',(1.65,.50,.462),(.045,.32,.012),navy,'Storage',.005)
# Leave room for the refinery pipe to be visible between the buildings.
for obj in collections['Storage'].objects:
 obj.location.x+=.34; obj.location.y+=.12
# Dimensions use the same ground reference. Garage is the broadest building;
# the tank is tallest, and the compact drill has an unobstructed working face.
def place_asset(group, origin, target, scale):
 bpy.context.view_layer.update()
 transform=Matrix.Translation(Vector(target)) @ Matrix.Diagonal((*scale,1)) @ Matrix.Translation(-Vector(origin))
 for o in collections[group].objects:o.matrix_world=transform @ o.matrix_world
place_asset('Drill',(-1.6,.95,0),(-2.15,1.25,-.025),(1.08,1.08,1.04))
place_asset('Refinery',(.05,1.30,0),(-.15,1.70,0),(1.03,1.03,1.0))
place_asset('Storage',(1.99,1.07,0),(2.70,1.0,0),(1.43,1.38,1.12))
# Submarine occupies its own clear space forward of the base.
# Nose points toward camera; rotor and hull are separate editable parts.
sx,sy=-1.9,-3.8
cylinder('Submarine main hull',(sx,sy,.70),.61,1.48,cream,'Submarine','Y',vertices=64)
sphere('Rounded stern',(sx,sy+.64,.70),(.61,.30,.61),cream,'Submarine')
sphere('Rounded bow',(sx,sy-.63,.70),(.61,.30,.61),cream,'Submarine')
cylinder('Rear golden hull band',(sx,sy+.62,.70),.59,.26,yellow,'Submarine','Y')
cylinder('Nose rim',(sx,sy-1.02,.70),.62,.30,yellow,'Submarine','Y')
cylinder('Window frame',(sx,sy-1.20,.70),.53,.12,navy,'Submarine','Y')
cylinder('Cyan window',(sx,sy-1.29,.70),.47,.08,cyan,'Submarine','Y')
sphere('Domed glass',(sx,sy-1.34,.70),(.47,.17,.47),cyan,'Submarine')
shine=mat('Glass highlight',(.65,1,1),0,.18)

box('Sub side panel bezel',(sx-.63,sy+.08,.75),(.04,.33,.19),navy,'Submarine',.03)
box('Sub side panel',(sx-.66,sy+.08,.75),(.02,.25,.12),cyan,'Submarine',.02)
# Broad annular duct with a real open center and a softened rectangular section.
rv=[]; rf=[]; count=64
for yy,rr in [(sy+1.1,.50),(sy+1.34,.50),(sy+1.1,.39),(sy+1.34,.39)]:
 for i in range(count):
  angle=2*pi*i/count; rv.append((sx+rr*math.cos(angle),yy,.70+rr*math.sin(angle)))
for i in range(count):
 j=(i+1)%count
 for aa,bb in [(0,1),(2,0),(1,3),(3,2)]: rf.append((aa*count+i,aa*count+j,bb*count+j,bb*count+i))
m=bpy.data.meshes.new('Propeller duct mesh');m.from_pydata(rv,[],rf);m.update();o=bpy.data.objects.new('Open propeller duct',m);bpy.context.scene.collection.objects.link(o);move(o,'Submarine',yellow);bevel(o,.025,3);smooth(o)
cylinder('Propeller shaft',(sx,sy+.96,.70),.14,.65,navy,'Submarine','Y')
cylinder('Propeller hub',(sx,sy+1.22,.70),.12,.12,navy,'Submarine','Y')
for angle in (0,pi/3,2*pi/3):
 o=box('Propeller blade',(sx,sy+1.23,.70),(.78,.07,.12),navy,'Submarine',.04); o.rotation_euler[1]=angle
box('Top fin pedestal',(sx,sy+.30,1.28),(.35,.76,.14),yellow,'Submarine',.06)
# Swept fin with an angled leading edge, not a rectangular block.
vertsfin=[(sx-.11,sy+.05,1.31),(sx-.11,sy+.66,1.31),(sx-.11,sy+.61,1.78),(sx-.11,sy+.16,1.85),(sx+.11,sy+.05,1.31),(sx+.11,sy+.66,1.31),(sx+.11,sy+.61,1.78),(sx+.11,sy+.16,1.85)]
meshfin=bpy.data.meshes.new('Swept fin mesh'); meshfin.from_pydata(vertsfin,[],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]); meshfin.update(); fin=bpy.data.objects.new('Swept dorsal fin',meshfin); bpy.context.scene.collection.objects.link(fin); move(fin,'Submarine',yellow); bevel(fin,.06,4)
for x in [sx-.66,sx+.66]:
 fin=box('Side fin',(x,sy+.15,.43),(.53,.43,.09),yellow,'Submarine',.10); fin.rotation_euler[2]=.20 if x<sx else -.20
for x in [sx-.48,sx+.48]:
 cylinder('Lamp housing',(x,sy-1.30,.29),.17,.22,navy,'Submarine','Y')
 cylinder('Lamp lens',(x,sy-1.43,.29),.13,.045,light,'Submarine','Y')
# Turn the sub around to match the reference: propeller at the left, glass at the right.
# Scale it as the principal foreground silhouette.
subpivot=Vector((sx,sy,.70))
for obj in collections['Submarine'].objects:
 delta=obj.location-subpivot
 obj.location=subpivot+Matrix.Rotation(5*pi/12, 3, 'Z') @ (delta*1.25)
 obj.rotation_euler=(Matrix.Rotation(5*pi/12, 3, 'Z') @ obj.rotation_euler.to_matrix()).to_euler()
 obj.scale*=1.25
# The vehicle floats below the island deck, clear of the cliff.
for o in collections['Submarine'].objects:
 delta=o.location-subpivot; o.location=Vector((-1.9,-4.6,-.45))+delta*1.18; o.scale*=1.18
# Warm beams from the submarine's lamps, illuminating the seabed.
for obj in list(collections['Submarine'].objects):
 if obj.name.startswith('Lamp lens'):
  bpy.ops.object.light_add(type='POINT',location=obj.location+Vector((.15,-.2,-.10)))
  bpy.context.object.name='Lamp glow'; bpy.context.object.data.energy=8; bpy.context.object.data.color=(1,.68,.30); bpy.context.object.data.shadow_soft_size=.35
# Scene staging, excluded from individual model exports.
# Gently patterned seabed material; all colors and light remain editable.
nt=sea.node_tree; nodes=nt.nodes; links=nt.links
noise=nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=2.8; noise.inputs['Detail'].default_value=2; noise.inputs['Roughness'].default_value=.55
ramp=nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.24; ramp.color_ramp.elements[0].color=(.002,.06,.09,1); ramp.color_ramp.elements[1].position=.78; ramp.color_ramp.elements[1].color=(.008,.14,.18,1)
geometry=nodes.new('ShaderNodeNewGeometry'); links.new(geometry.outputs['Position'],noise.inputs['Vector']); noise.inputs['Scale'].default_value=.7; links.new(noise.outputs['Fac'],ramp.inputs[0]); links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
nt=sand.node_tree; n=nt.nodes; l=nt.links
tex=n.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=5; tex.inputs['Detail'].default_value=2
bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.13; bump.inputs['Distance'].default_value=.055; l.new(tex.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])
# A spatial light pattern brightens the seabed and sand, preserving base color.
for material,amount in [(sand,.025),(sea,.012)]:
 nt=material.node_tree;n=nt.nodes;l=nt.links;p=n.get('Principled BSDF')
 geometry=n.new('ShaderNodeNewGeometry');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1.3;noise.inputs['Detail'].default_value=1
 l.new(geometry.outputs['Position'],noise.inputs['Vector'])
 scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs['Scale'].default_value=.23;l.new(noise.outputs['Color'],scale.inputs[0])
 add=n.new('ShaderNodeVectorMath');add.operation='ADD';l.new(geometry.outputs['Position'],add.inputs[0]);l.new(scale.outputs['Vector'],add.inputs[1])
 vor=n.new('ShaderNodeTexVoronoi');vor.feature='DISTANCE_TO_EDGE';vor.inputs['Scale'].default_value=1.4;l.new(add.outputs['Vector'],vor.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.008;ramp.color_ramp.elements[0].color=(amount,amount*.94,amount*.70,1);ramp.color_ramp.elements[1].position=.11;ramp.color_ramp.elements[1].color=(0,0,0,1);l.new(vor.outputs['Distance'],ramp.inputs[0]);l.new(ramp.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1
# Background rocks are environmental set dressing, not part of the asset exports.
for x,y,z,sc in [(-8,4,-1.05,(.65,.8,.38)),(-6,6,-1.05,(.8,.7,.38)),(7,5,-1.05,(.8,.9,.4)),(6,-5,-1.05,(.7,.6,.35)),(-7,-6,-1.05,(.7,.8,.35)),(1,-8,-1.1,(.5,.5,.3))]:
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,z)); o=bpy.context.object; o.name='Background rock'; o.scale=sc; o.data.materials.append(rock)
# Kelp clusters in the surrounding water create a soft frame around the base.
coral=mat('Muted coral',(.55,.13,.09))
for px,py in [(-5.2,-2.2),(-4.7,3.5),(4.8,3.7),(4.6,-3.6)]:
 branch('Environment kelp',[(px,py,-1.2),(px-.05,py,-.8),(px+.04,py,-.3),(px,py,.10)],.09,green)
 for sign in [-1,1]:
  branch('Environment kelp branch',[(px,py,-.85),(px+sign*.23,py,-.65),(px+sign*.3,py,-.25)],.065,green)
 cx=px+.65
 for sign in [-1,1]: branch('Coral branch',[(cx,py,-1.2),(cx,py,-.95),(cx+sign*.22,py,-.70),(cx+sign*.25,py,-.55)],.05,coral)
# Environment reaches the deeper seabed and has soft living branch tips.
for obj in list(bpy.context.scene.objects):
 if obj.name.startswith(('Environment kelp','Coral branch','Background rock')):
  obj.location.z-=.8
# Additional coral fans frame the foreground.
for px,py in [(-4,-4.5),(3,-2.5),(4,2.5),(-3,3.8)]:
 branch('Coral trunk',[(px,py,-2),(px-.04,py,-1.7),(px+.04,py,-1.35),(px-.03,py,-1.05)],.085,coral)
 for sign in [-1,1]:
  branch('Coral arm',[(px,py,-1.75),(px+sign*.22,py,-1.57),(px+sign*.34,py,-1.3),(px+sign*.29,py,-1.17)],.065,coral)
  branch('Coral finger',[(px+sign*.18,py,-1.6),(px+sign*.4,py+.03,-1.52),(px+sign*.47,py+.03,-1.36)],.045,coral)
# Broad irregular rock columns, with large readable facets rather than small triangles.
for i in range(16):
 angle=2*pi*i/16; px=2.93*math.cos(angle); py=1+1.49*math.sin(angle)
 cv=[]; cf=[]; sides=7; height=1.40+random.random()*.78
 for ring,(rr,zz) in enumerate([(1,-.17),(1.08,-.65),(.68,-height)]):
  for j in range(sides):
   a=2*pi*j/sides; r=rr*(.92+random.random()*.16)
   cv.append((px+math.cos(a)*.59*r,py+math.sin(a)*.40*r,zz+random.uniform(-.1,.1)))
 cf.append(tuple(range(sides-1,-1,-1)))
 for ring in range(2):
  for j in range(sides):
   a=ring*sides+j;b=ring*sides+(j+1)%sides;cf.append((a,b,b+sides,a+sides))
 cf.append(tuple(range(2*sides,3*sides)))
 m=bpy.data.meshes.new('Broad rock mesh');m.from_pydata(cv,[],cf);m.update();o=bpy.data.objects.new('Cliff column',m);bpy.context.scene.collection.objects.link(o);move(o,'Island',rock);bevel(o,.055,2)
# Enlarge the land itself; environment corals retain their world positions.
for o in collections['Island'].objects:
 if o.name.startswith(('Faceted rocky','Sandy island','Cliff','Faceted stone','Kelp')):
  o.location.x*=1.25;o.location.y=1+(o.location.y-1)*1.35
  o.scale.x*=1.25;o.scale.y*=1.35
  if o.type=='MESH' and o.name.startswith(('Faceted rocky','Sandy island','Cliff column')):
   # These meshes were authored using world coordinates.
   o.location.x=0;o.location.y=-.35
for px,py,h in [(-7,5,2.7),(-6.3,5.8,1.7),(6,5,2.5),(7,4.5,1.5),(-6,-6,2),(6,-4,1.8)]:
 for j in range(3):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(px+j*.55,py+(j%2)*.4,-2+h*.38));o=bpy.context.object;o.name='Distant rock pillar';o.scale=(.95,.85,h*.62*(1-j*.18));o.data.materials.append(rock);bevel(o,.09,2)
# Actual participating water volume for the offline render (not exported to glTF).
water=bpy.data.materials.new('Water scattering'); water.use_nodes=True
wn=water.node_tree.nodes; wn.clear(); output=wn.new('ShaderNodeOutputMaterial'); vol=wn.new('ShaderNodeVolumePrincipled'); vol.inputs['Color'].default_value=(.12,.52,.62,1); vol.inputs['Density'].default_value=.012; vol.inputs['Anisotropy'].default_value=.4; water.node_tree.links.new(vol.outputs['Volume'],output.inputs['Volume'])
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,5)); waterbox=bpy.context.object; waterbox.name='Offline water volume'; waterbox.scale=(60,60,18); waterbox.data.materials.append(water); waterbox.hide_set(True)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-2.40)); o=bpy.context.object; o.name='Ocean backdrop'; o.data.materials.append(sea)
world=bpy.context.scene.world; world.color=(.04,.12,.14)
world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.025,.12,.16,1); world.node_tree.nodes['Background'].inputs[1].default_value=.22
bpy.ops.object.light_add(type='AREA',location=(-3,-3,10)); bpy.context.object.data.energy=1800; bpy.context.object.data.color=(1,.88,.66); bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
bpy.ops.object.light_add(type='AREA',location=(4,4,7)); bpy.context.object.data.energy=500; bpy.context.object.data.color=(.36,.75,1); bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(9,-15,10)); cam=bpy.context.object; cam.rotation_euler=(Vector((-.15,-.55,-.18))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=13.2; bpy.context.scene.camera=cam
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=32 if os.environ.get('ABYSS_DRAFT') else 80; scene.cycles.use_denoising=True; scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=65 if os.environ.get('ABYSS_DRAFT') else 100
scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.view_settings.exposure=.4; scene.render.image_settings.file_format='PNG'; scene.render.filepath=os.path.join(OUT,'preview.png')
# Lighting travels with the GLB into the browser.
for position,power,color in [((-3,-4,7),0,(1,.87,.64)),((3,2,6),0,(.40,.80,1))]:
 bpy.ops.object.light_add(type='POINT',location=position); bpy.context.object.data.energy=power; bpy.context.object.data.color=color; bpy.context.object.data.shadow_soft_size=2
# glTF cannot carry Blender procedural node graphs. Export standard PBR fallback
# values, then restore the exact offline node connections before saving/rendering.
def export_glb(**kwargs):
 disconnected=[]
 for material in bpy.data.materials:
  if not material.use_nodes:continue
  principled=material.node_tree.nodes.get('Principled BSDF')
  if not principled:continue
  for name in ['Base Color','Emission Color','Normal']:
   socket=principled.inputs[name]
   for link in list(socket.links):
    disconnected.append((material.node_tree,link.from_socket,link.to_socket));material.node_tree.links.remove(link)
 try:bpy.ops.export_scene.gltf(**kwargs)
 finally:
  for nt,src,dst in disconnected:nt.links.new(src,dst)
# Convert organic curves for portable glTF export.
for obj in list(bpy.context.scene.objects):
 if obj.type=='CURVE':
  bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj; bpy.ops.object.convert(target='MESH')
def asset_bounds(objects):
 graph=bpy.context.evaluated_depsgraph_get()
 points=[o.matrix_world @ Vector(corner) for o in objects if o.type=='MESH' for corner in o.evaluated_get(graph).bound_box]
 lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 return lo,hi
metrics={}
for group,collection in collections.items():
 lo,hi=asset_bounds(collection.objects)
 metrics[group]={'min':[round(v,4) for v in lo],'max':[round(v,4) for v in hi],'size':[round(v,4) for v in hi-lo]}
with open(os.path.join(OUT,'dimensions.json'),'w') as f:json.dump(metrics,f,indent=2)
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
 if (obj.type=='MESH' and obj.name!='Offline water volume') or (obj.type=='LIGHT' and obj.data.type=='POINT'): obj.select_set(True)
export_glb(filepath=os.path.join(OUT,'scene.glb'),export_format='GLB',export_apply=True,use_selection=True,export_lights=True)
# Save the complete editable assembly, then export independent GLBs with local origins.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shallows-scene.blend'))
for group,c in collections.items():
 bpy.ops.object.select_all(action='DESELECT')
 objs=list(c.objects)
 # Keep the individual assets centered in XY, but preserve their ground height.
 lo,hi=asset_bounds(objs);center=(lo+hi)*.5
 shift=Vector((center.x,center.y,0))
 for o in objs: o.location-=shift; o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 export_glb(filepath=os.path.join(OUT,group.lower()+'.glb'),export_format='GLB',export_apply=True,use_selection=True)
 for o in objs: o.location+=shift
bpy.ops.object.select_all(action='DESELECT')
waterbox.hide_set(False)
scene.render.filepath=os.path.join(OUT,'preview.png'); bpy.ops.render.render(write_still=True)

# Close-up helps inspect the vehicle's silhouette, glass, bands and lamps.
cam.location=(4,-11,4.6); cam.rotation_euler=(Vector((-1.9,-4.6,-.45))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=5.5
scene.render.resolution_x=1000; scene.render.resolution_y=750; scene.render.filepath=os.path.join(OUT,'submarine-detail.png'); bpy.ops.render.render(write_still=True)
