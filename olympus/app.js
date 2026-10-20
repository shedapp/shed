// ===================== PROGRAM DATA =====================
const VIDEOS = {"incline_db_press":{"demo":{"url":"https://www.youtube.com/watch?v=DnV3R4vp3K0","title":"Incline Dumbbell Press - Chest Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=0G2_XV7slIg","title":"Grow Your Chest with the INCINE DUMBBELL PRESS","channel":"Mind Pump"}},"barbell_ohp":{"demo":{"url":"https://www.youtube.com/watch?v=8E4oWpi0RkA","title":"Standing Military Press - Shoulder Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=_RlRDWO2jfg","title":"Build Bigger Shoulders With Perfect Training Technique (The Overhead Press)","channel":"Jeff Nippard"}},"flat_db_press":{"demo":{"url":"https://www.youtube.com/watch?v=Vc63DPUoA40","title":"Dumbbell Bench Press - Chest Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=SHsUIZiNdeY","title":"Dumbbell Bench Press (BETTER CHEST ACTIVATION!)","channel":"ATHLEAN-X"}},"lateral_raise":{"demo":{"url":"https://www.youtube.com/watch?v=LT1Eo-q58yg","title":"Side Lateral Raise - Shoulder Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=ezNquXfB5Mk","title":"How to Lateral Raise for Maximum Muscle Growth","channel":"Mind Pump"}},"cable_fly_low_high":{"demo":{"url":"https://www.youtube.com/watch?v=aQ1U0uV2hF0","title":"Single Arm Low Cable Fly - OPEX Exercise Library","channel":"OPEX Fitness"}},"overhead_cable_triceps":{"demo":{"url":"https://www.youtube.com/watch?v=mRozZKkGIfg","title":"Cable Rope Overhead Tricep Extension - Tricep Exercise - Bodybuilding.com","channel":"Bodybuilding.com"}},"hanging_leg_raise":{"demo":{"url":"https://www.youtube.com/watch?v=Nw0LOKe3_l8","title":"Hanging Leg Raise - Ab Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=Pr1ieGZ5atk","title":"Hanging Leg Raise | HOW-TO","channel":"ATHLEAN-X"}},"back_squat":{"demo":{"url":"https://www.youtube.com/watch?v=tVB1q8zkP3o","title":"Squat - Leg Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=SbgHegC6lEs","title":"How to Back Squat | #AskSquatU Show Ep. 10","channel":"Squat University"}},"front_squat":{"demo":{"url":"https://www.youtube.com/watch?v=9Hi_sgKPNEo","title":"Front Barbell Squat - Leg Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=G-Vamqoy8qM","title":"How To Front Squat With Perfect Form (Stop Making These Mistakes)","channel":"Squat University"}},"bulgarian_split_squat":{"demo":{"url":"https://www.youtube.com/watch?v=oGTVhFgRnes","title":"Bodyweight Bulgarian Split Squat / Torokhtiy Weightlifting Library","channel":"Torokhtiy Weightlifting Library"},"pro":{"url":"https://www.youtube.com/watch?v=-4LVK1crLSw","title":"The ULTIMATE Bulgarian Split Squat Tutorial","channel":"Squat University"}},"leg_press":{"demo":{"url":"https://www.youtube.com/watch?v=3R0SOJ3alTA","title":"Leg Press - Leg Exercise - Bodybuilding.com","channel":"Bodybuilding.com"}},"walking_lunge":{"demo":{"url":"https://www.youtube.com/watch?v=8fZxWTiIJWo","title":"Dumbbell Walking Lunge - OPEX Exercise Library","channel":"OPEX Fitness"},"pro":{"url":"https://www.youtube.com/watch?v=Pwsn3HR4L90","title":"Stop Doing Lunges Like This! (SAVE A FRIEND)","channel":"ATHLEAN-X"}},"standing_calf_raise":{"demo":{"url":"https://www.youtube.com/watch?v=MAMzF7iZNkc","title":"Standing Calf Raises - Calves Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=Xa18jxyeSnM","title":"8 Calf Raise Mistakes and How to Fix Them","channel":"Renaissance Periodization"}},"ab_wheel":{"demo":{"url":"https://www.youtube.com/watch?v=Q5MT5omGNJI","title":"Ab Roller - Ab Exercises - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=A3uK5TPzHq8","title":"Never Do Ab Wheel Rollouts Like This!","channel":"ATHLEAN-X"}},"plank":{"demo":{"url":"https://www.youtube.com/watch?v=tgbrMdfuGJA","title":"Plank / Planking - Ab Exercises - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=sI-MNJTbf7U","title":"Home Abs Exercises - FIXED! (Planks and Rollouts)","channel":"ATHLEAN-X"}},"cable_crunch":{"demo":{"url":"https://www.youtube.com/watch?v=3qjoXDTuyOE","title":"Cable Crunch - Abs / Core Exercise - Bodybuilding.com","channel":"Bodybuilding.com"}},"weighted_pullup":{"demo":{"url":"https://www.youtube.com/watch?v=fnJ0F1Xsu7Y","title":"Weighted Pull-Ups (How To)","channel":null},"pro":{"url":"https://www.youtube.com/watch?v=Hdc7Mw6BIEE","title":"The Best Way To Do Pull Ups For A Wide Back (Optimal Training Technique)","channel":"Jeff Nippard"}},"barbell_row":{"demo":{"url":"https://www.youtube.com/watch?v=9Xf3DqxxTBA","title":"Bent Over Barbell Row - Back Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=T3N-TO4reLQ","title":"How to do Barbell Rows PROPERLY for a Big Back (AVOID MISTAKES!)","channel":"ATHLEAN-X"}},"chest_supported_row":{"demo":{"url":"https://www.youtube.com/watch?v=0-DXJiceG-0","title":"Chest Supported Incline Dumbbell Row - OPEX Exercise Library","channel":"OPEX Fitness"},"pro":{"url":"https://www.youtube.com/watch?v=axoeDmW0oAY","title":"How To Build a Thick Back With Perfect Rowing Technique (Pendlay Row/ Helms Row)","channel":"Jeff Nippard"}},"lat_pulldown_neutral":{"demo":{"url":"https://www.youtube.com/watch?v=lmmShS3KLB4","title":"Neutral Grip Lat Pulldown","channel":null},"pro":{"url":"https://www.youtube.com/watch?v=SALxEARiMkw","title":"How to do Lat Pulldowns (AVOID MISTAKES!)","channel":"ATHLEAN-X"}},"one_arm_cable_row":{"demo":{"url":"https://www.youtube.com/watch?v=NwyhyKyFgf4","title":"Single Arm Seated Cable Row","channel":null}},"face_pull":{"demo":{"url":"https://www.youtube.com/watch?v=tkLTR4b6cAk","title":"Face Pull - Shoulder Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=eIq5CB9JfKE","title":"Stop Doing Face Pulls Like This! (SAVE A FRIEND)","channel":"ATHLEAN-X"}},"incline_db_curl":{"demo":{"url":"https://www.youtube.com/watch?v=fDqBcp3wbZM","title":"Low Incline Dumbbell Curl - OPEX Exercise Library","channel":"OPEX Fitness"},"pro":{"url":"https://www.youtube.com/watch?v=DCe8f6vMe9A","title":"Stop Screwing Up Incline Dumbbell Curls (PROPER FORM!)","channel":"ATHLEAN-X"}},"hammer_curl":{"demo":{"url":"https://www.youtube.com/watch?v=0IAM2YtviQY","title":"Hammer Curl - Biceps Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=7jqi2qWAUJk","title":"How To Do Hammer Curls for HUGE Biceps (BICEP GROWTH!)","channel":"Mind Pump"}},"romanian_deadlift":{"demo":{"url":"https://www.youtube.com/watch?v=e1pFg9Rz55k","title":"Romanian Deadlift - Leg Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=_oyxCn2iSjU","title":"HOW TO DO ROMANIAN DEADLIFTS (RDLs): Build Beefy Hamstrings With Perfect Technique","channel":"Jeff Nippard"}},"trap_bar_deadlift":{"demo":{"url":"https://www.youtube.com/watch?v=5BpuTmfQjro","title":"How to PROPERLY Trap Bar Deadlift (Avoid These 3 Common Mistakes)","channel":null}},"conventional_deadlift":{"demo":{"url":"https://www.youtube.com/watch?v=a5zhnubunoE","title":"Barbell Deadlift - Leg & Back Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=VL5Ab0T07e4","title":"Build A Bigger Deadlift With Perfect Technique (Conventional Form)","channel":"Jeff Nippard"}},"lying_leg_curl":{"demo":{"url":"https://www.youtube.com/watch?v=jxctD6fL_FQ","title":"Lying Leg Curls - Leg Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=jobEeklwrrs","title":"9 Leg Curl Mistakes and How to Fix Them","channel":"Renaissance Periodization"}},"hip_thrust":{"demo":{"url":"https://www.youtube.com/watch?v=Fk1OfkMmVt4","title":"Barbell Hip Thrust - Legs / Glutes Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=S_uZP4UH6J0","title":"How To Do A Barbell Hip Thrust The RIGHT Way! (FIX THIS!!!)","channel":"Mind Pump"}},"db_shrug":{"demo":{"url":"https://www.youtube.com/watch?v=8lP_eJvClSA","title":"Dumbbell Shrug - Shoulder Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=Jl2fzN3mY_k","title":"9 Shrug Mistakes and How to Fix Them","channel":"Renaissance Periodization"}},"dead_bug":{"demo":{"url":"https://www.youtube.com/watch?v=ciu7aVuqdgM","title":"Alternating Dead Bug - OPEX Exercise Library","channel":"OPEX Fitness"}},"pallof_press":{"demo":{"url":"https://www.youtube.com/watch?v=suXbr509tFQ","title":"Banded Standing Pallof Press - OPEX Exercise Library","channel":"OPEX Fitness"}},"seated_db_press":{"demo":{"url":"https://www.youtube.com/watch?v=tzZMsrzG_zE","title":"Dumbbell Shoulder Press - Shoulder Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=HzIiNhHhhtA","title":"Seated Dumbbell Shoulder Press","channel":"Renaissance Periodization"}},"push_up":{"demo":{"url":"https://www.youtube.com/watch?v=XIHO5t_VBPQ","title":"Pushups - Chest Exercise - Bodybuilding.com","channel":"Bodybuilding.com"},"pro":{"url":"https://www.youtube.com/watch?v=YwFmEsa_lIk","title":"Best Way to do Pushups (FOR A BIGGER CHEST!)","channel":"ATHLEAN-X"}},"hill_sprints":{"demo":{"url":"https://www.youtube.com/watch?v=iuRkesShAAE","title":"Hill Sprints Technique Uphill and Downhill","channel":null},"pro":{"url":"https://www.youtube.com/watch?v=T2BjmDitJVU","title":"Running Workout Routine | Hill Sprints for Speed & Strength","channel":"The Run Experience"}},"running_strides":{"demo":{"url":"https://www.youtube.com/watch?v=Xavc25wlPOo","title":"Run Faster using Strides - Everything you need to know - Feat. Kevin Quinn (PUMA Coach)","channel":null},"pro":{"url":"https://www.youtube.com/watch?v=1i2ZPpXtuOk","title":"How To Run Strides And How They Make You Faster","channel":"The Run Experience"}},"running_form":{"demo":{"url":"https://www.youtube.com/watch?v=Vxj88hohaac","title":"Running Mechanics for Proper Form: Blue Benadum","channel":null},"pro":{"url":"https://www.youtube.com/watch?v=gYajoeR_UF8","title":"PERFECT RUNNING FORM - Explained","channel":"James Dunne"}},"easy_run_pace":{"pro":{"url":"https://m.youtube.com/watch?v=rVtNNl1leJA","title":"How to Pace Your Runs (And Actually Get Faster)","channel":"Ben Parkes"}},"interval_training":{"pro":{"url":"https://www.youtube.com/watch?v=IOQg96TGSW8","title":"Sage Canaday: Training For an OTQ| Episode 3: Track workout for Running Economy","channel":"Sage Canaday"}},"tempo_run":{"pro":{"url":"https://www.youtube.com/watch?v=hDYp3U8b1nU","title":"Tempo Run Workouts: Correct Pace and Intensity","channel":"Sage Canaday"}},"warm_up_running":{"pro":{"url":"https://www.youtube.com/watch?v=UWU5lypfWec","title":"Must Do Dynamic Drills Warm Up for Runners","channel":"The Run Experience"}},"warm_up_lifting":{"pro":{"url":"https://www.youtube.com/watch?v=E81GN-3A8XM","title":"The Most Effective Science-Based Warm Up & Mobility Routine (Full Body)","channel":"Jeff Nippard"}}};
const ILLUS = {"incline_db_press":{"a":"img/incline_db_press-a.webp","b":"img/incline_db_press-b.webp"},"barbell_ohp":{"a":"img/barbell_ohp-a.webp","b":"img/barbell_ohp-b.webp"},"flat_db_press":{"a":"img/flat_db_press-a.webp","b":"img/flat_db_press-b.webp"},"lateral_raise":{"a":"img/lateral_raise-a.webp","b":"img/lateral_raise-b.webp"},"cable_fly_low_high":{"a":"img/cable_fly_low_high-a.webp","b":"img/cable_fly_low_high-b.webp"},"overhead_cable_triceps":{"a":"img/overhead_cable_triceps-a.webp","b":"img/overhead_cable_triceps-b.webp"},"hanging_leg_raise":{"a":"img/hanging_leg_raise-a.webp","b":"img/hanging_leg_raise-b.webp"},"back_squat":{"a":"img/back_squat-a.webp","b":"img/back_squat-b.webp"},"front_squat":{"a":"img/front_squat-a.webp","b":"img/front_squat-b.webp"},"bulgarian_split_squat":{"a":"img/bulgarian_split_squat-a.webp","b":"img/bulgarian_split_squat-b.webp"},"leg_press":{"a":"img/leg_press-a.webp","b":"img/leg_press-b.webp"},"walking_lunge":{"a":"img/walking_lunge-a.webp","b":"img/walking_lunge-b.webp"},"standing_calf_raise":{"a":"img/standing_calf_raise-a.webp","b":"img/standing_calf_raise-b.webp"},"ab_wheel":{"a":"img/ab_wheel-a.webp","b":"img/ab_wheel-b.webp"},"cable_crunch":{"a":"img/cable_crunch-a.webp","b":"img/cable_crunch-b.webp"},"weighted_pullup":{"a":"img/weighted_pullup-a.webp","b":"img/weighted_pullup-b.webp"},"barbell_row":{"a":"img/barbell_row-a.webp","b":"img/barbell_row-b.webp"},"lat_pulldown_neutral":{"a":"img/lat_pulldown_neutral-a.webp","b":"img/lat_pulldown_neutral-b.webp"},"one_arm_cable_row":{"a":"img/one_arm_cable_row-a.webp","b":"img/one_arm_cable_row-b.webp"},"incline_db_curl":{"a":"img/incline_db_curl-a.webp","b":"img/incline_db_curl-b.webp"},"hammer_curl":{"a":"img/hammer_curl-a.webp","b":"img/hammer_curl-b.webp"},"romanian_deadlift":{"a":"img/romanian_deadlift-a.webp","b":"img/romanian_deadlift-b.webp"},"trap_bar_deadlift":{"a":"img/trap_bar_deadlift-a.webp","b":"img/trap_bar_deadlift-b.webp"},"conventional_deadlift":{"a":"img/conventional_deadlift-a.webp","b":"img/conventional_deadlift-b.webp"},"lying_leg_curl":{"a":"img/lying_leg_curl-a.webp","b":"img/lying_leg_curl-b.webp"},"db_shrug":{"a":"img/db_shrug-a.webp","b":"img/db_shrug-b.webp"},"seated_db_press":{"a":"img/seated_db_press-a.webp","b":"img/seated_db_press-b.webp"},"push_up":{"a":"img/push_up-a.webp","b":"img/push_up-b.webp"},"chest_supported_row":{"a":"img/chest_supported_row-a.webp","b":"img/chest_supported_row-b.webp"}};
const ILLUS_NOTES = {"barbell_ohp": "Illustrated seated; do it standing as programmed.", "cable_fly_low_high": "Illustrated high-to-low; yours runs low-to-high with the same arc.", "overhead_cable_triceps": "Illustrated with a barbell; use the rope on the cable.", "hanging_leg_raise": "Illustrated lying on a bench; hang from the bar with the same pelvic curl.", "barbell_row": "Illustrated with an underhand grip; use overhand.", "trap_bar_deadlift": "Illustrated with a barbell; the trap bar keeps the handles at your sides.", "one_arm_cable_row": "Illustrated two-handed; do one arm at a time.", "chest_supported_row": "Illustrated as a T-bar row; keep the chest on the pad.", "cable_crunch": "Illustrated seated; kneel facing the stack.", "seated_db_press": "Illustrated one arm at a time; use both.", "bulgarian_split_squat": "Rear foot on the bench, as illustrated."};
const SAFETY = {"incline_db_press": ["Shoulder: keep the shoulder blades pinned; if the front of the shoulder pinches, lower the bench to 15° or bring the elbows in.", "Never let the dumbbells drift behind the shoulder line at the bottom; that is where the joint capsule gets strained."], "barbell_ohp": ["Lower back: ribs down, glutes tight. An arched lower back under a bar overhead is the most common injury in this lift.", "Shoulder: if the elbows must flare to get the bar over the mid-foot, swap to the seated dumbbell press."], "flat_db_press": ["Elbows no lower than the bench line; deeper stretches the front capsule under load.", "Wrists stacked over the elbows; a bent wrist sends the load into the forearm tendons."], "lateral_raise": ["Stop at shoulder height; above it the upper trap takes over and the rotator cuff impinges.", "Any pinch at the top of the shoulder: lean 20° forward and raise slightly in front of the body."], "cable_fly_low_high": ["Soft elbows throughout; a straight-arm fly loads the biceps tendon and the front of the shoulder.", "Shoulder blades stay back; do not let the shoulders roll forward at the bottom."], "overhead_cable_triceps": ["Elbow pain: shorten the stretch at the bottom and warm the elbows with 20 light reps first.", "Keep the ribs down; arching to reach overhead is a lower-back problem, not a mobility fix."], "hanging_leg_raise": ["Hang with the shoulders packed down; a loose dead hang stresses the shoulder capsule.", "Lower back arching at the bottom means the abs have let go: bend the knees more."], "back_squat": ["Knees track over the toes, never inward; knee cave under load is the main ligament risk in the gym.", "Depth is as low as the back stays neutral; when the pelvis tucks under, you are past it. Stop there."], "front_squat": ["Wrists: if the rack position hurts, use straps or the crossed-arm grip; never force the wrists back.", "Elbows up protects the spine; when they drop, rack the bar."], "bulgarian_split_squat": ["Front knee tracks the second toe; heel stays down.", "Hip flexor of the rear leg pinching: lower the bench or bring the front foot slightly closer."], "leg_press": ["Never lock the knees at the top; keep a small bend.", "Hips lifting off the pad at the bottom rounds the lower back under load; shorten the range."], "walking_lunge": ["Rear knee kisses the floor, never slams; control the descent.", "Knee pain on the front leg: lengthen the stride and keep the shin vertical."], "standing_calf_raise": ["Achilles: no bouncing, especially in the first weeks; the tendon adapts more slowly than the muscle.", "Knee straight but not locked."], "ab_wheel": ["The lower back must never sag; the moment it does, that rep is over.", "Wrists: push through the heel of the hand; use angled handles if they ache."], "plank": ["Hips level with the shoulders; a sagging plank loads the lumbar discs.", "Neck neutral, eyes down."], "cable_crunch": ["Hips stay still; movement comes from curling the spine, not folding at the hip.", "Pulling with the arms strains the neck; the hands only hold the rope at the forehead."], "weighted_pullup": ["Shoulders: start each rep by pulling the blades down before the elbows bend; hanging loose stresses the joint.", "Pain on the inside of the elbow: drop the added weight and widen the grip slightly."], "barbell_row": ["Neutral spine from hinge to row; the lower back is braced, never rounded.", "If the lower back fatigues before the lats, use the chest-supported version."], "chest_supported_row": ["Chest stays on the pad; lifting it turns the row into a lower-back exercise.", "Shoulders down, away from the ears."], "lat_pulldown_neutral": ["Never pull behind the neck; the shoulder is in a weak position there.", "Lean back no more than 15°; beyond that it becomes a row."], "one_arm_cable_row": ["No twisting of the torso; the spine stays square to the stack.", "Shoulder stays down as the elbow passes the ribs."], "face_pull": ["Light weight only; this exercise protects the rotator cuff and must never load it heavily.", "Elbows stay at or above shoulder height."], "incline_db_curl": ["If the stretched position pinches the front of the shoulder, raise the bench to 60°.", "Elbows soft at the bottom; never hyperextend under load."], "hammer_curl": ["Wrist neutral; do not bend it to lift more.", "Elbows pinned; swinging shifts the load to the front delt."], "romanian_deadlift": ["Flat back every rep; the hamstring stretch ends the range, not the floor.", "Bar close to the legs; a bar drifting forward multiplies the load on the lumbar discs."], "trap_bar_deadlift": ["Brace before the pull: no breath, no lift.", "Lock out tall; leaning back at the top compresses the lumbar spine."], "conventional_deadlift": ["Neutral spine off the floor; if it rounds, lift from blocks.", "Never jerk the bar; take the slack out first."], "lying_leg_curl": ["Hips pressed into the pad; lifting them strains the lower back.", "Full range, but no slamming of the pad at the bottom."], "hip_thrust": ["Chin tucked and ribs down at the top; an arched lower back means you are extending the spine, not the hip.", "Pad under the bar; the hip crease bruises without it."], "db_shrug": ["Straight up and down; rolling the shoulders grinds the joint.", "Neck neutral; do not jut the chin forward."], "dead_bug": ["Lower back stays pressed to the floor the whole time; shorten the leg extension until it does.", "Breathe out slowly as the limbs extend."], "pallof_press": ["Knees soft, hips square; any twist means the weight is too heavy.", "Shoulders down."], "seated_db_press": ["Back against the pad; do not arch to finish the press.", "Lower to ear height, not below."], "push_up": ["One straight line; sagging hips load the lower back.", "Elbows at 45°, not flared to 90°."]};

// Each exercise teaches: why it is in the plan, muscles, 3 cues, 2 mistakes, tempo, breathing, how to pick the load, and an animated demo key.
const EXERCISES = {
  incline_db_press:{name:'Incline dumbbell press',muscles:'Upper chest · front delts · triceps',primary:'chest',unit:'lb',anim:'incline_db_press',
    why:'The upper chest is what makes a chest look full from the collarbone down. Dumbbells let the hands travel in and up, which the barbell cannot.',
    cues:['Bench at 30°. Feet planted, shoulder blades pulled back and down, slight arch.','Lower to the outer chest with the elbows about 45° from the body.','Drive up and slightly in; stop just short of locking the elbows.'],
    mistakes:['Bench too steep (45°+) turns it into a shoulder press.','Elbows flared to 90° — shoulders take the load, chest does not.'],
    tempo:'2 s down · pause · 1 s up',breathe:'Breathe in on the way down, out as you press.',load:'A weight you could do 10 with on set 1. Add 5 lb per dumbbell when all sets hit 8.'},
  barbell_ohp:{name:'Standing barbell overhead press',muscles:'Front and side delts · triceps · core',primary:'shoulders',unit:'lb',anim:'barbell_ohp',
    why:'The single best builder of shoulder caps and a strong-looking upper body. It also teaches the brace that protects your back everywhere else.',
    cues:['Bar on the collarbone, grip just outside the shoulders, glutes squeezed, ribs down.','Press straight up; move the head back then through once the bar passes the forehead.','Lock out with the bar over the mid-foot and lower under control to the chin.'],
    mistakes:['Leaning back into a standing incline press; lower back takes the strain.','Pressing around the chin instead of pulling the head back and through.'],
    tempo:'1 s up · 2 s down',breathe:'Big breath in, brace, press; exhale at the top.',load:'Start at 60% of what you think you can do for 5. Add 5 lb when all sets hit 6 reps.'},
  flat_db_press:{name:'Flat dumbbell press',muscles:'Chest · triceps · front delts',primary:'chest',unit:'lb',anim:'flat_db_press',
    why:'Pure chest mass with a longer range than the barbell and less shoulder strain.',
    cues:['Dumbbells over the chest, wrists stacked over the elbows.','Lower until the upper arms are just below parallel to the floor.','Press up and together without clanging the dumbbells at the top.'],
    mistakes:['Bouncing out of the bottom.','Hands drifting over the face instead of over the chest.'],
    tempo:'2 s down · 1 s up',breathe:'In on the way down, out as you press.',load:'Same dumbbells as the incline press or 5 lb heavier.'},
  lateral_raise:{name:'Dumbbell lateral raise',muscles:'Side delts',primary:'shoulders',unit:'lb',anim:'lateral_raise',
    why:'Width. Side delts are the shoulder muscle that makes a V-taper; nothing else trains them directly.',
    cues:['Slight forward lean, pinkies a touch higher than thumbs, like pouring water.','Raise to shoulder height, leading with the elbows, not the hands.','Lower for 2 full seconds. The last set goes to failure.'],
    mistakes:['Swinging with the hips; the delts never get the work.','Going above shoulder height, which shifts the load to the traps.'],
    tempo:'1 s up · 2 s down',breathe:'Out as you raise, in as you lower.',load:'Lighter than you think: 15–20 lb for most strong men. Form first, weight last.'},
  cable_fly_low_high:{name:'Cable fly, low to high',muscles:'Upper chest · front delts',primary:'chest',unit:'lb',anim:'cable_fly_low_high',
    why:'Finishes the upper chest with constant tension that dumbbells lose at the top.',
    cues:['Pulleys at the bottom. Step forward into a staggered stance, chest tall.','Sweep the hands up and in to eye level with soft elbows.','Squeeze the upper chest for a full second at the top.'],
    mistakes:['Bending the elbows into a press.','Shrugging the shoulders up as the hands rise.'],
    tempo:'1 s up · 1 s hold · 2 s down',breathe:'Out on the squeeze.',load:'Light. If you cannot hold the top for a second, drop the weight.'},
  overhead_cable_triceps:{name:'Overhead cable triceps extension',muscles:'Triceps, long head',primary:'arms',unit:'lb',anim:'overhead_cable_triceps',
    why:'The long head of the triceps is two thirds of the arm and only fully works with the arm overhead.',
    cues:['Face away from the stack, rope behind the head, elbows pointing forward beside the ears.','Extend fully and spread the rope at the end.','Let the elbows stay still; only the forearms move.'],
    mistakes:['Elbows drifting out to the sides.','Cutting the stretch short at the bottom; the stretch is where the growth is.'],
    tempo:'1 s out · 2 s back',breathe:'Out as you extend.',load:'Moderate. 10 reps should be hard but clean.'},
  hanging_leg_raise:{name:'Hanging leg raise',muscles:'Lower abs · hip flexors · grip',primary:'core',unit:'bw',anim:'hanging_leg_raise',
    why:'Lower abs are what show last and what this exercise hits first. The hang also builds the grip you need for pull-ups.',
    cues:['Dead hang, shoulders pulled down away from the ears.','Tilt the pelvis first, then bring the knees or straight legs to hip height or higher.','Lower slowly with no swing between reps.'],
    mistakes:['Swinging to generate momentum.','Only lifting the legs without curling the pelvis; that is a hip-flexor exercise.'],
    tempo:'1 s up · 3 s down',breathe:'Out as the legs rise.',load:'Bodyweight. Bent knees until 15 clean reps, then straight legs, then add a dumbbell between the feet.'},
  back_squat:{name:'Back squat',muscles:'Quads · glutes · adductors · core',primary:'legs',unit:'lb',anim:'back_squat',
    why:'The biggest driver of leg size and whole-body strength. Legs that match the torso are what separate a physique from a T-shirt body.',
    cues:['Brace hard before each rep, bar over the mid-foot, eyes on a spot ahead.','Sit down between the hips, knees tracking over the toes.','Hit parallel or a touch below and drive the floor away.'],
    mistakes:['Knees caving inward on the way up.','Chest dropping first, turning the squat into a good morning.'],
    tempo:'2 s down · 1 s up',breathe:'Breathe in and brace at the top, hold through the rep, exhale at lockout.',load:'Start with a weight you own for 8. Add 10 lb when all sets hit 6.'},
  front_squat:{name:'Front squat',muscles:'Quads · upper back · core',primary:'legs',unit:'lb',anim:'front_squat',
    why:'Knee-friendly swap for the back squat; forces an upright torso and hammers the quads.',
    cues:['Elbows high, bar resting on the shoulders, not held by the hands.','Stay upright and sit straight down.','Lead with the elbows out of the bottom.'],
    mistakes:['Elbows dropping, which dumps the bar forward.','Rising hips-first.'],
    tempo:'2 s down · 1 s up',breathe:'Brace at the top, exhale at lockout.',load:'About 70–80% of the back squat.'},
  bulgarian_split_squat:{name:'Bulgarian split squat',muscles:'Quads · glutes · balance',primary:'legs',unit:'lb',anim:'bulgarian_split_squat',
    why:'Single-leg strength is what you had as a footballer and what makes the glutes look like an athlete\'s. It also finds and fixes left-right gaps.',
    cues:['Rear foot on a bench, front shin vertical at the bottom.','Lower straight down until the rear knee nearly touches.','Push through the front mid-foot. Same reps each leg, weaker leg first.'],
    mistakes:['Front foot too close to the bench; the knee shoots forward.','Leaning so far forward it becomes a hip exercise only.'],
    tempo:'2 s down · 1 s up',breathe:'In on the way down, out on the way up.',load:'Bodyweight first time; then dumbbells in both hands.'},
  leg_press:{name:'Leg press',muscles:'Quads · glutes',primary:'legs',unit:'lb',anim:'leg_press',
    why:'Quad volume without more weight on the spine after the squat.',
    cues:['Feet mid-platform at hip width, lower back flat on the pad.','Lower until the knees reach about 90° without the hips rolling up.','Press through the whole foot; never lock the knees.'],
    mistakes:['Tiny half-reps with a mountain of plates.','Hips lifting off the pad at the bottom.'],
    tempo:'2 s down · 1 s up',breathe:'In down, out up.',load:'A weight you can control for 12 with a full range.'},
  walking_lunge:{name:'Walking lunge, dumbbells',muscles:'Glutes · quads · conditioning',primary:'legs',unit:'lb',anim:'walking_lunge',
    why:'Conditioning and glute work in one. The athletic version of leg day.',
    cues:['Long stride, torso tall, dumbbells hanging still.','Both knees to 90°, rear knee an inch from the floor.','Drive through the front heel into the next step. 20 steps total.'],
    mistakes:['Short steps that stress the knee.','Letting the torso fold forward.'],
    tempo:'Steady, one step every 2 s',breathe:'Natural rhythm.',load:'Light dumbbells; the 20 steps should burn, not stop you.'},
  standing_calf_raise:{name:'Standing calf raise',muscles:'Calves',primary:'legs',unit:'lb',anim:'standing_calf_raise',
    why:'Calves frame the legs from the ground up and respond to one thing: a full stretch with a pause.',
    cues:['Full stretch at the bottom with a 2-second pause.','Rise onto the big toe as high as possible.','Control the way down; no bouncing.'],
    mistakes:['Bouncing off the Achilles.','Short reps from the middle of the range.'],
    tempo:'1 s up · 1 s hold · 2 s down · 2 s pause',breathe:'Out as you rise.',load:'Heavy enough that 15 is hard with the pause.'},
  ab_wheel:{name:'Ab wheel rollout',muscles:'Deep core · abs · lats',primary:'core',unit:'bw',anim:'ab_wheel',
    why:'Trains the abs to resist extension, which is what keeps the waist flat and tight.',
    cues:['Start on the knees, hips slightly tucked, ribs down.','Roll out as far as the lower back stays flat.','Pull back with the abs, not the arms. No wheel: plank 60 s.'],
    mistakes:['Letting the lower back sag at the far end.','Hips piking up on the way back.'],
    tempo:'3 s out · 2 s back',breathe:'Out as you roll out.',load:'Bodyweight. Add range before reps.'},
  plank:{name:'Plank',muscles:'Core',primary:'core',unit:'time',anim:'plank',
    why:'The simplest brace. Used here as the substitute for the wheel.',
    cues:['Elbows under the shoulders, glutes squeezed, ribs tucked.','One straight line from head to heels.','Breathe. 60 seconds per set.'],
    mistakes:['Hips sagging.','Holding the breath.'],
    tempo:'Hold 60 s',breathe:'Slow breaths through the nose.',load:'Bodyweight; make it harder by squeezing harder, not longer.'},
  cable_crunch:{name:'Cable crunch',muscles:'Upper abs',primary:'core',unit:'lb',anim:'cable_crunch',
    why:'Abs are a muscle; they grow with load like any other. This is how the upper blocks get thick enough to show.',
    cues:['Kneel facing the stack, rope held at the forehead.','Crunch the ribs toward the hips; the hips do not move.','Control the return and keep tension on the abs.'],
    mistakes:['Pulling with the arms.','Bowing from the hips instead of curling the spine.'],
    tempo:'1 s down · 2 s up',breathe:'Out as you crunch.',load:'Moderate. 15 reps with a real squeeze.'},
  weighted_pullup:{name:'Weighted pull-up',muscles:'Lats · biceps · rear delts',primary:'back',unit:'bw',anim:'weighted_pullup',
    why:'The width of the V comes from the lats, and nothing widens the lats like a pull-up you can load.',
    cues:['Wide overhand grip, dead hang, shoulders packed down.','Drive the elbows to the hips, chin clearly over the bar.','Lower fully under control. Log the added weight; 0 means bodyweight.'],
    mistakes:['Kipping or half-reps from the middle.','Shrugging into the ears at the top.'],
    tempo:'1 s up · 2 s down',breathe:'Out as you pull.',load:'Under 8 clean reps: bodyweight for 4 sets of max. Over 8: add 10 lb.'},
  barbell_row:{name:'Barbell row',muscles:'Mid back · lats · rear delts',primary:'back',unit:'lb',anim:'barbell_row',
    why:'Back thickness. Pull-ups give width; rows give the depth that shows from the side.',
    cues:['Hinge to about 45°, flat back, bar hanging under the chest.','Pull to the lower ribs, elbows close to the body.','Pause a beat at the top; no body swing.'],
    mistakes:['Torso heaving up every rep.','Rounding the lower back.'],
    tempo:'1 s up · 2 s down',breathe:'Out as you row.',load:'A weight you can pause at the top with for 8.'},
  chest_supported_row:{name:'Chest-supported row',muscles:'Mid back · rear delts',primary:'back',unit:'lb',anim:'chest_supported_row',
    why:'Strict rowing with zero lower-back load; the swap when the barbell row feels wrong.',
    cues:['Chest on the pad, let the shoulder blades spread at the bottom.','Row the elbows back and squeeze the blades together.','Slow negative.'],
    mistakes:['Lifting the chest off the pad.','Short reps.'],
    tempo:'1 s up · 1 s hold · 2 s down',breathe:'Out as you row.',load:'Moderate, with a hold.'},
  lat_pulldown_neutral:{name:'Lat pulldown, neutral grip',muscles:'Lower lats',primary:'back',unit:'lb',anim:'lat_pulldown_neutral',
    why:'The lower lats are the line that runs into the waist; the neutral grip hits them where pull-ups cannot.',
    cues:['Neutral handles, slight lean back, chest up.','Pull to the upper chest, elbows toward the hips.','Full stretch at the top of every rep.'],
    mistakes:['Leaning back into a row.','Pulling behind the neck.'],
    tempo:'1 s down · 2 s up',breathe:'Out as you pull.',load:'Moderate; feel the stretch before the pull.'},
  one_arm_cable_row:{name:'Seated cable row, one arm',muscles:'Rhomboids · lats',primary:'back',unit:'lb',anim:'one_arm_cable_row',
    why:'One arm at a time catches the imbalance that every former footballer has from the kicking side.',
    cues:['Square the hips, reach forward to stretch the lat.','Row to the hip with the elbow tight to the ribs.','Same reps each side; the weaker side goes first.'],
    mistakes:['Twisting the torso to pull.','Shrugging the shoulder up.'],
    tempo:'1 s in · 2 s out',breathe:'Out as you row.',load:'Moderate; clean reps.'},
  face_pull:{name:'Face pull',muscles:'Rear delts · rotator cuff · mid traps',primary:'shoulders',unit:'lb',anim:'face_pull',
    why:'Rear delts make the shoulders look 3D and keep them healthy for all the pressing. The best posture exercise there is.',
    cues:['Rope at eye height, thumbs pointing back toward you.','Pull toward the forehead with the elbows high and wide.','Squeeze the rear delts; light weight, perfect reps.'],
    mistakes:['Going heavy and turning it into a row.','Elbows dropping below the shoulders.'],
    tempo:'1 s in · 1 s hold · 2 s out',breathe:'Out as you pull.',load:'Light. 20 reps should be possible with a pause.'},
  incline_db_curl:{name:'Incline dumbbell curl',muscles:'Biceps, long head',primary:'arms',unit:'lb',anim:'incline_db_curl',
    why:'The stretched position builds the peak of the biceps; it only exists on an incline.',
    cues:['Bench at 45°, arms hanging straight back.','Curl without letting the elbows come forward.','Full stretch at the bottom of every rep.'],
    mistakes:['Elbows swinging forward to make the rep easier.','Cutting the bottom short.'],
    tempo:'1 s up · 3 s down',breathe:'Out as you curl.',load:'Lighter than a standing curl.'},
  hammer_curl:{name:'Hammer curl',muscles:'Brachialis · forearms',primary:'arms',unit:'lb',anim:'hammer_curl',
    why:'The brachialis sits under the biceps and pushes it up; thickness from the side.',
    cues:['Neutral grip, elbows pinned to the sides.','Curl to shoulder height with no swing.','Lower in 2 seconds.'],
    mistakes:['Swinging the elbows forward.','Rushing the negative.'],
    tempo:'1 s up · 2 s down',breathe:'Out as you curl.',load:'Moderate, 12 clean reps.'},
  romanian_deadlift:{name:'Romanian deadlift',muscles:'Hamstrings · glutes · lower back',primary:'legs',unit:'lb',anim:'romanian_deadlift',
    why:'The whole posterior chain in one lift. Hamstrings and glutes are what a physique looks like from behind.',
    cues:['Soft knees. Push the hips back and let the bar glide down the thighs.','Lower until the hamstrings stretch hard, back flat, bar close.','Stand up by driving the hips forward, not by lifting the chest.'],
    mistakes:['Bending the knees into a squat.','Rounding the back to go lower than the hamstrings allow.'],
    tempo:'3 s down · 1 s up',breathe:'In at the top, brace, exhale after the hips lock.',load:'Start light and feel the stretch; add 10 lb when all sets hit 8.'},
  trap_bar_deadlift:{name:'Trap-bar deadlift',muscles:'Glutes · hamstrings · quads · traps · grip',primary:'legs',unit:'lb',anim:'trap_bar_deadlift',
    why:'The safest way to lift heavy from the floor. It builds the traps that make the neck-to-shoulder line of a strong man.',
    cues:['Hips higher than the knees, chest up, brace hard.','Push the floor away; hips and shoulders rise together.','Lock out tall. On even weeks the heavy hip thrust takes this slot.'],
    mistakes:['Hips shooting up first.','Leaning back at the top.'],
    tempo:'1 s up · 2 s down',breathe:'Big breath and brace before each rep.',load:'Heavy: 4–5 reps with 1 in reserve. Add 10 lb when all sets hit 5.'},
  conventional_deadlift:{name:'Conventional deadlift',muscles:'Posterior chain · grip',primary:'legs',unit:'lb',anim:'conventional_deadlift',
    why:'The barbell version when no trap bar is available.',
    cues:['Bar over mid-foot, shins to the bar, lats tight.','Push the floor away and keep the bar against the legs.','Stand tall without leaning back.'],
    mistakes:['Bar drifting forward.','Rounded lower back off the floor.'],
    tempo:'1 s up · 2 s down',breathe:'Brace before each rep.',load:'Heavy, 4–5 reps.'},
  lying_leg_curl:{name:'Lying leg curl',muscles:'Hamstrings',primary:'legs',unit:'lb',anim:'lying_leg_curl',
    why:'The hamstrings also bend the knee; the deadlift only trains them at the hip.',
    cues:['Hips pressed into the pad.','Curl fully to the glutes.','Lower slowly over 3 seconds.'],
    mistakes:['Hips lifting off the pad.','Dropping the weight on the way down.'],
    tempo:'1 s up · 3 s down',breathe:'Out as you curl.',load:'Moderate, full range.'},
  hip_thrust:{name:'Hip thrust',muscles:'Glutes',primary:'legs',unit:'lb',anim:'hip_thrust',
    why:'The glutes are the biggest muscle in the body and the back view of every physique. This loads them harder than anything.',
    cues:['Upper back on the bench, bar over the hips, chin tucked.','Drive the hips to full extension and squeeze for a full second.','Shins vertical at the top.'],
    mistakes:['Arching the lower back at the top instead of squeezing the glutes.','Feet too far out, which turns it into a hamstring exercise.'],
    tempo:'1 s up · 1 s hold · 2 s down',breathe:'Out as the hips drive up.',load:'Heavier than you expect; hold the top.'},
  db_shrug:{name:'Dumbbell shrug',muscles:'Upper traps',primary:'back',unit:'lb',anim:'db_shrug',
    why:'The slope from neck to shoulder. Traps read as power from every angle.',
    cues:['Stand tall, dumbbells at the sides.','Shrug straight up to the ears and hold 2 seconds.','No rolling of the shoulders.'],
    mistakes:['Rolling the shoulders in circles.','Bending the elbows.'],
    tempo:'1 s up · 2 s hold · 2 s down',breathe:'Out as you shrug.',load:'Heavy but held.'},
  dead_bug:{name:'Dead bug',muscles:'Core stability',primary:'core',unit:'bw',anim:'dead_bug',
    why:'Teaches the core to hold the ribs down while the limbs move, which is exactly what a flat stomach does.',
    cues:['Lower back glued to the floor, ribs down.','Extend the opposite arm and leg slowly on an exhale.','10 reps each side, no arch.'],
    mistakes:['Lower back lifting off the floor.','Rushing.'],
    tempo:'3 s out · 2 s back',breathe:'Long exhale as the limbs extend.',load:'Bodyweight.'},
  pallof_press:{name:'Pallof press',muscles:'Obliques, anti-rotation',primary:'core',unit:'lb',anim:'pallof_press',
    why:'Trains the obliques to resist rotation without thickening them, which keeps the waist narrow.',
    cues:['Cable at chest height, stand side-on to the stack.','Press the hands straight out and hold 2 seconds.','Resist the twist; 12 reps each side.'],
    mistakes:['Letting the hips rotate toward the stack.','Standing too close, no tension.'],
    tempo:'1 s out · 2 s hold · 1 s in',breathe:'Out as you press.',load:'Light enough to stay perfectly square.'},
  seated_db_press:{name:'Seated dumbbell press',muscles:'Delts · triceps',primary:'shoulders',unit:'lb',anim:'seated_db_press',
    why:'Shoulder-friendly swap for the barbell press.',
    cues:['Back on the bench, dumbbells at ear height.','Press up and slightly in.','Lower to the ears with control.'],
    mistakes:['Flaring the elbows straight out.','Arching off the bench.'],
    tempo:'1 s up · 2 s down',breathe:'Out as you press.',load:'Moderate.'},
  push_up:{name:'Push-up',muscles:'Chest · triceps · core',primary:'chest',unit:'bw',anim:'push_up',
    why:'The travel and hotel-gym press.',
    cues:['Hands under the shoulders, body in one line.','Chest to an inch from the floor.','Elbows at about 45°.'],
    mistakes:['Hips sagging.','Half-reps.'],
    tempo:'2 s down · 1 s up',breathe:'In down, out up.',load:'Bodyweight; elevate the feet to progress.'}
};

const PROGRAM = {
  days:{
    upperA:{label:'Upper A',focus:'Chest, shoulders, triceps',weekday:1,brief:'The V starts here: a full upper chest and capped shoulders. Push hard on the first two lifts, then chase the pump on the raises and flies. Rest fully between the heavy sets; rush nothing.',feel:'By the end the shoulders should feel tight and the upper chest full. Elbows and shoulder joints should never hurt; if they do, swap to the dumbbell press.',ex:[
      {key:'incline_db_press',sets:4,reps:'6–8',rest:150,main:true},
      {key:'barbell_ohp',sets:4,reps:'5–6',rest:150,main:true},
      {key:'flat_db_press',sets:3,reps:'8–10',rest:90},
      {key:'lateral_raise',sets:4,reps:'12–15',rest:60,note:'Last set to failure'},
      {key:'cable_fly_low_high',sets:3,reps:'12–15',rest:60},
      {key:'overhead_cable_triceps',sets:3,reps:'10–12',rest:60},
      {key:'hanging_leg_raise',sets:3,reps:'10–15',rest:60}]},
    lowerA:{label:'Lower A',focus:'Quads, glutes, core',weekday:2,brief:'Squat day. Legs that match the torso are what separate an athlete from a gym body, and the squat is also the biggest calorie burner in the week. Core work at the end trains the brace you used on the squat.',feel:'Quads burning on the split squats, glutes on the lunges. Knees track over the toes on every rep; if they cave, lighten the squat.',ex:[
      {key:'back_squat',sets:4,reps:'5–6',rest:180,main:true},
      {key:'bulgarian_split_squat',sets:3,reps:'8–10 each',rest:90,main:true},
      {key:'leg_press',sets:3,reps:'10–12',rest:90},
      {key:'walking_lunge',sets:2,reps:'20 steps',rest:90},
      {key:'standing_calf_raise',sets:4,reps:'12–15',rest:60,note:'2 s pause at the bottom'},
      {key:'ab_wheel',sets:3,reps:'8–12',rest:60},
      {key:'cable_crunch',sets:3,reps:'12–15',rest:60}]},
    upperB:{label:'Upper B',focus:'Back, rear delts, biceps',weekday:4,brief:'Width day. Pull-ups and rows build the lats and mid back that make the waist look small by comparison. Face pulls keep the shoulders healthy for Monday\'s pressing.',feel:'Lats should feel stretched at the bottom of every pull and cramped at the top. If you feel it mostly in the biceps, start each rep by driving the elbows down.',ex:[
      {key:'weighted_pullup',sets:4,reps:'6–8',rest:150,main:true,note:'Under 8 clean reps: 4 sets to max reps, 0 added'},
      {key:'barbell_row',sets:4,reps:'6–8',rest:150,main:true},
      {key:'lat_pulldown_neutral',sets:3,reps:'10–12',rest:90},
      {key:'one_arm_cable_row',sets:3,reps:'10–12 each',rest:60},
      {key:'face_pull',sets:3,reps:'15–20',rest:60},
      {key:'incline_db_curl',sets:3,reps:'10–12',rest:60},
      {key:'hammer_curl',sets:2,reps:'12',rest:60}]},
    lowerB:{label:'Lower B',focus:'Hinge, hamstrings, core',weekday:5,brief:'Hinge day. Hamstrings and glutes are the back view of a physique and the engine of your sprint. Deadlift and hip thrust alternate as the heavy lift from week to week.',feel:'Hamstrings stretched on the RDL, glutes squeezed on the thrust. The lower back should feel worked, never sharp. No run today.',ex:[
      {key:'romanian_deadlift',sets:4,reps:'6–8',rest:150,main:true},
      {key:'trap_bar_deadlift',sets:3,reps:'4–5',rest:180,main:true,note:'Even weeks: heavy hip thrust 4×8 instead'},
      {key:'lying_leg_curl',sets:3,reps:'10–12',rest:60},
      {key:'hip_thrust',sets:3,reps:'8–10',rest:90},
      {key:'db_shrug',sets:3,reps:'12–15',rest:60,note:'2 s hold at the top'},
      {key:'dead_bug',sets:3,reps:'10 each',rest:45},
      {key:'pallof_press',sets:3,reps:'12 each',rest:45}]}
  },
  order:['upperA','lowerA','upperB','lowerB'],
  subs:{incline_db_press:['flat_db_press','push_up'],barbell_ohp:['seated_db_press'],back_squat:['front_squat','leg_press'],barbell_row:['chest_supported_row'],trap_bar_deadlift:['conventional_deadlift','hip_thrust'],ab_wheel:['plank'],flat_db_press:['push_up']},
  warmup:[{t:'3 min bike or row',d:'Raise the body temperature; you should be slightly warm, not tired.'},{t:'2 × 15 band pull-aparts',d:'Wakes the rear delts and sets the shoulder blades.'},{t:'2 × 10 cat-cow',d:'Moves the spine through its range before loading it.'},{t:'2 × 10 bodyweight squats',d:'Hips, knees and ankles open; feel the brace.'},{t:'2–3 ramp-up sets of the first lift',d:'Bar, then 50%, then 75% of the working weight for 3–5 reps each. Never go straight to the working set.'}]
};

// Running: the three sessions per week. kind: easy | track | long. Track sessions are structured.
const RUN_PLAN = [
  {weeks:[1,2],easy:{min:20},track:{type:'intervals',reps:6,dist:400,rest:90,label:'6 × 400 m, 90 s walk'},long:{min:30}},
  {weeks:[3,4],easy:{min:25},track:{type:'intervals',reps:8,dist:400,rest:75,label:'8 × 400 m, 75 s rest'},long:{min:35}},
  {weeks:[5,6],easy:{min:25},track:{type:'intervals',reps:5,dist:800,rest:120,label:'5 × 800 m, 2 min rest'},long:{min:40}},
  {weeks:[7,8],easy:{min:30},track:{type:'intervals',reps:3,dist:1200,rest:150,label:'3 × 1,200 m, 2.5 min rest'},long:{min:45}},
  {weeks:[9,10],easy:{min:30},track:{type:'tempo',min:20,label:'20 min tempo (10 easy before and after)'},long:{min:50}},
  {weeks:[11],easy:{min:30},track:{type:'intervals',reps:4,dist:1000,rest:120,label:'4 × 1,000 m, 2 min rest'},long:{min:60}},
  {weeks:[12],easy:{min:25},track:{type:'timetrial',dist:5000,label:'5 km time trial — the benchmark'},long:{min:40}}
];
const RUN_BRIEFS = {
  easy:{title:'Easy run',purpose:'Builds the aerobic base: more capillaries, a stronger heart, and legs that recover faster. This is where most of your soccer engine lived.',feel:'You could hold a conversation the whole way. Nose-breathing possible. If in doubt, slow down; a slow easy run still counts, a fast one steals from the track.',steps:['5 min walk-jog to start','Settle into the easy window and stay there','Last minute: 20 s a little quicker, then walk 3 min']},
  track:{title:'Track session',purpose:'Raises the ceiling: VO2 max, leg speed and the ability to clear lactate. One hard session a week is enough; two would eat into the lifting.',feel:'Reps are hard but repeatable: the last one should be as fast as the first. If you are slowing by more than 5 s per rep, start slower next week.',steps:['10 min easy jog','4 × 60 m strides, walk back','The reps, resting as prescribed','5 min walk, 5 min easy jog']},
  long:{title:'Long run',purpose:'Extends endurance and teaches the body to burn fat for fuel. Volume builds the engine; it does not need to be fast.',feel:'Easy for the whole distance. Finish feeling you could do 10 more minutes. Fuel with a banana 45 min before.',steps:['5 min walk-jog','Easy pace, flat route if possible','Walk 5 min after and drink 500 ml']},
  tempo:{title:'Tempo run',purpose:'Raises the lactate threshold: the pace you can hold without blowing up. This is the 5 km engine.',feel:'Comfortably hard: 3–4 word sentences only. Not a race; even pace from first minute to last.',steps:['10 min easy','20 min at tempo pace','10 min easy, then walk']},
  timetrial:{title:'5 km time trial',purpose:'The benchmark of the block. Everything in the running plan was built to move this number.',feel:'First km controlled, middle three steady, last km everything. 12.5 laps of the inside lane.',steps:['15 min easy + 4 strides','Start at target pace, not faster','Lap button every 400 m','Walk 10 min after']},
  walk:{title:'Rest and walk',purpose:'Recovery is where the body builds what the week asked for. Walking keeps the blood moving without adding fatigue.',feel:'Relaxed. Phone away, 45–60 minutes.',steps:['Walk 45–60 min','Meal prep for the week','Sleep 8 hours tonight']}
};
const PACES = [
  {k:'Easy',d:'Conversational; nose-breathing possible. Most people run this too fast.'},
  {k:'Tempo',d:'Comfortably hard; 3–4 word sentences only. The pace you could hold for 40 minutes.'},
  {k:'Intervals',d:'Hard; around 5 km race pace or a touch faster. Not a sprint.'}
];
// Pace targets derived from one anchor: the current 5 km time (seconds).
function paceTargets(fiveKSec){const p=fiveKSec/5;return {easy:[p+75,p+110],long:[p+80,p+115],tempo:[p+18,p+32],rep:{400:[p*0.4*0.90,p*0.4*0.95],800:[p*0.8*0.94,p*0.8*0.98],1000:[p*0.96,p*1.0],1200:[p*1.2*0.97,p*1.2*1.01]},timetrial:fiveKSec*0.985};}

const DEFAULT_PROFILE = {
  name:'Martín', startDate:'2026-10-19', heightIn:70.5, startWeightLb:189, targetWeightLb:180, startBodyFat:19, targetBodyFat:14.5,
  kcal:2450, protein:175, carbs:265, fat:75, waterL:3.5, stepsGoal:10000, liftUnit:'lb', lapM:400, fiveKSec:1530,
  goal:'By January 11, 2027: 180 lb at ~15% body fat, waist down 2 inches, 10 strict pull-ups, 5 km under 24:00 — all lifts at or above today\'s numbers.'
};

const SEED_MEALS = [
  {name:'4 eggs, scrambled',kcal:300,p:25,c:2,f:21,meal:'Breakfast'},
  {name:'Oats (1 cup cooked) with banana and cinnamon',kcal:270,p:7,c:56,f:3,meal:'Breakfast'},
  {name:'Grilled chicken breast, 200 g',kcal:330,p:62,c:0,f:7,meal:'Lunch'},
  {name:'Rice, 1 cup cooked',kcal:205,p:4,c:45,f:1,meal:'Lunch'},
  {name:'Big salad, 1 tbsp olive oil and lemon',kcal:160,p:2,c:8,f:14,meal:'Lunch'},
  {name:'Greek yogurt 200 g, berries, handful of granola',kcal:290,p:22,c:36,f:6,meal:'Snack'},
  {name:'Lean beef (93%), 180 g',kcal:300,p:42,c:0,f:14,meal:'Dinner'},
  {name:'Salmon, 180 g',kcal:370,p:38,c:0,f:24,meal:'Dinner'},
  {name:'Roasted potatoes, 250 g',kcal:260,p:5,c:48,f:5,meal:'Dinner'},
  {name:'Sweet potato, 250 g',kcal:215,p:4,c:50,f:0,meal:'Dinner'},
  {name:'Broccoli or green beans, 150 g',kcal:50,p:4,c:8,f:0,meal:'Dinner'},
  {name:'Whey shake, 1 scoop in water',kcal:120,p:25,c:3,f:2,meal:'Snack'},
  {name:'Cottage cheese, 150 g',kcal:150,p:17,c:5,f:6,meal:'Snack'},
  {name:'Banana',kcal:105,p:1,c:27,f:0,meal:'Snack'},
  {name:'Milanesa (baked), 150 g',kcal:330,p:35,c:18,f:12,meal:'Dinner'},
  {name:'Vacío, trimmed, 180 g',kcal:380,p:40,c:0,f:24,meal:'Dinner'}
];
const MEALS = ['Breakfast','Lunch','Snack','Dinner','Evening'];
const TIPS = [
  'Weigh in every morning; only the 7-day average means anything.',
  'Protein at every meal, 35–60 g, and hunger stays quiet.',
  'The lifts holding while the scale drops is the proof it\'s fat.',
  'Easy runs easy. Hard runs hard. Never medium.',
  'Never miss twice in a row.',
  'Creatine 5 g daily; the first two weeks of water weight don\'t count.',
  'A bad 20-minute session still counts. Mark it done.',
  'Lateral raises are the single most important V-taper exercise. Don\'t skip the last set.'
];
const LESSONS = [
  {id:'shape',title:'The shape of the 12 weeks',sub:'Why the weeks are not all the same',body:['Weeks 1–2 ramp: three sets on the big lifts and nothing to failure. The nervous system needs a fortnight to re-learn four days a week; the volume will feel light and that is the point.','Weeks 3–6 build: full sets, add weight the week every set hits the top of the rep range.','Weeks 7–10 push: one extra set on lateral raises and pull-ups, the two lifts that build the V. The hardest block.','Week 11 deload: three sets everywhere, two reps short of failure, easy running. Fatigue drops, strength shows up the week after.','Week 12 test: 5RM squat, 6RM incline press, max pull-ups, 5 km time trial. Photos and measurements. Then decide: maintenance block or a second cut.']},
  {id:'load',title:'Choosing the weight and progressing',sub:'Reps in reserve and double progression',body:['Every set stops 1–2 reps short of failure unless marked. One rep in reserve feels like: the bar slows noticeably on the last rep, you could grind one more, you choose not to.','Double progression: when you hit the top of the rep range on every set (4 × 8 on a 6–8 lift), add 5 lb for upper body or 10 lb for lower body next session and start again at the bottom of the range.','First session on a lift: pick a weight you could do about 10 with, do the prescribed reps, and let the log teach you. Being slightly light on day one costs nothing.','The app pre-fills your last session; the only question each set is whether to repeat it or add a rep. That is the whole system.']},
  {id:'deficit',title:'Why 2,450 calories and 175 g of protein',sub:'The math behind the plan',body:['Your maintenance on this schedule is about 2,900 kcal (Mifflin-St Jeor × 1.6 for 7 sessions). A 450 kcal deficit loses about 0.7 lb of fat per week: fast enough to see, slow enough to keep every pound of muscle.','Protein at 2 g per kg of body weight is the single most protective number in a cut. It keeps muscle, keeps you full, and costs a few calories to digest.','Fat stays at 75 g for hormones; never below 60. Carbs fill the rest and fuel the lifting and the track.','The scale lies daily: water, salt, carbs and creatine move it 2–4 lb. The 7-day average and the waist tape tell the truth. After two weeks the app estimates what you actually burn from intake and the trend and adjusts by at most 150 kcal a week.']},
  {id:'paces',title:'The three paces',sub:'Easy must be easy',body:['Easy: conversational, nose-breathing possible. It builds the aerobic base and recovers the legs. Almost everyone runs it too fast and then has nothing for the track.','Tempo: comfortably hard, 3–4 word sentences. The pace you could hold for 40 minutes. This raises the lactate threshold, which is the 5 km engine.','Intervals: around 5 km race pace or slightly faster, never a sprint. The last rep should match the first. If you slow by more than 5 seconds per rep, start the next session slower.','The app derives every target from one number, your current 5 km time, in Settings. Beat it in a time trial and every target moves with it.']},
  {id:'warmup',title:'Warming up properly',sub:'Eight minutes that prevent most injuries',body:['Lifting: 3 minutes of bike or row, band pull-aparts, cat-cow, bodyweight squats, then ramp sets of the first lift: bar, 50%, 75% of the working weight for 3–5 reps each. Never go straight to the working set.','Running: 10 minutes easy, then 4 strides of 60 m: relaxed accelerations to about 90% speed, walk back. They wake up the fast fibres before the reps.','Cool-down: 5 minutes of walking and 500 ml of water. Stretching is optional; sleep is not.']},
  {id:'recovery',title:'Recovery, soreness and pain',sub:'When to push and when to back off',body:['Soreness is dull, both sides, worse the second morning, better once warm. Train through it. Pain is sharp, one-sided, in a joint, and worse as you warm up. Stop that exercise and use the swap.','Sleep 7–8 hours. Below 6 the body loses muscle in a deficit no matter how well you eat.','10,000 steps a day is half of the deficit without any extra training. Walk on rest days.','Not feeling 100%: use the lighter-day option when you start a session. One set less on the accessories, the big lifts stay. Never miss two of the same session in a row.']},
  {id:'numbers',title:'Reading the numbers',sub:'What the app is showing you',body:['Estimated 1RM: weight × (1 + reps ÷ 30). A PR is any set whose estimate beats your best. It lets a 60 × 8 and a 65 × 6 be compared.','Trend weight: a 7-day moving average. While you lose, it sits above the scale; the lag is normal.','Expenditure: average intake plus the calories in the week\'s weight change. It needs four logged food days and two weeks of weigh-ins before it says anything.','Pace per km from laps: a 400 m lap in 1:48 is 4:30 per km, 13.3 km/h. Lap time × 2.5 = pace per km.']}
];

// ===================== ANIMATED EXERCISE DEMOS =====================
// A small articulated figure drawn in SVG. Poses are segment directions in degrees: side view 0 = down, 90 = forward (+x), 180 = up, 270 = back.
// Front view: 0 = down, 90 = out from the body, 180 = up, 270 = across the body. Lengths in body units (thigh = 0.76).
const FIG={T:1.0,N:0.1,HR:0.19,UA:0.5,FA:0.46,TH:0.76,SH:0.72,FT:0.26,SW:0.44,HW:0.28};
const ANIMS={
  incline_db_press:{view:'side',g:'bench',hipY:0.75,props:['benchIncline','dumbbells'],frames:[{t:240,th:86,sh:5,ua:338,fa:165,ua2:338,fa2:165},{t:240,th:86,sh:5,ua:150,fa:150,ua2:150,fa2:150}]},
  barbell_ohp:{view:'side',g:'feet',props:['barbellHand'],frames:[{t:180,th:0,sh:0,ua:40,fa:175,ua2:40,fa2:175},{t:180,th:0,sh:0,ua:176,fa:180,ua2:176,fa2:180,hd:-8}]},
  flat_db_press:{view:'side',g:'bench',hipY:0.75,props:['benchFlat','dumbbells'],frames:[{t:270,th:86,sh:5,ua:345,fa:180,ua2:345,fa2:180},{t:270,th:86,sh:5,ua:180,fa:180,ua2:180,fa2:180}]},
  lateral_raise:{view:'front',g:'feet',props:['dumbbells'],frames:[{t:180,th:0,sh:0,ua:8,fa:12},{t:180,th:0,sh:0,ua:92,fa:95}]},
  cable_fly_low_high:{view:'front',g:'feet',props:['dumbbellsNo','cableLowBoth'],frames:[{t:180,th:0,sh:0,ua:55,fa:65},{t:180,th:0,sh:0,ua:232,fa:252}]},
  overhead_cable_triceps:{view:'side',g:'feet',props:['cableBackLow'],frames:[{t:175,th:0,sh:0,ua:178,fa:250,ua2:178,fa2:250},{t:175,th:0,sh:0,ua:178,fa:165,ua2:178,fa2:165}]},
  hanging_leg_raise:{view:'side',g:'hang',props:['bar'],frames:[{t:180,th:3,sh:0,ua:178,fa:180,ua2:178,fa2:180},{t:180,th:90,sh:88,ua:178,fa:180,ua2:178,fa2:180}]},
  back_squat:{view:'side',g:'feet',props:['barbellShoulder'],frames:[{t:178,th:2,sh:0,ua:250,fa:140,ua2:250,fa2:140},{t:150,th:75,sh:-8,ua:250,fa:140,ua2:250,fa2:140}]},
  front_squat:{view:'side',g:'feet',props:['barbellFront'],frames:[{t:180,th:2,sh:0,ua:90,fa:235,ua2:90,fa2:235},{t:165,th:75,sh:-8,ua:90,fa:235,ua2:90,fa2:235}]},
  bulgarian_split_squat:{view:'side',g:'feet',props:['dumbbells','box'],frames:[{t:178,th:15,sh:-5,th2:-20,sh2:-115,ua:0,fa:0,ua2:0,fa2:0},{t:165,th:80,sh:-5,th2:-15,sh2:-150,ua:0,fa:0,ua2:0,fa2:0}]},
  leg_press:{view:'side',g:'bench',hipY:0.6,props:['seat','sled'],frames:[{t:210,th:140,sh:60,ua:20,fa:60,ua2:20,fa2:60},{t:210,th:125,sh:125,ua:20,fa:60,ua2:20,fa2:60}]},
  walking_lunge:{view:'side',g:'feet',cycle:'loop',dur:2400,props:['dumbbells'],frames:[{t:178,th:25,sh:-5,th2:-25,sh2:-60,ua:0,fa:0,ua2:0,fa2:0},{t:178,th:85,sh:0,th2:-15,sh2:-95,ua:0,fa:0,ua2:0,fa2:0},{t:178,th:50,sh:-5,th2:-35,sh2:-40,ua:0,fa:0,ua2:0,fa2:0}]},
  standing_calf_raise:{view:'side',g:'toes',props:['dumbbells'],frames:[{t:180,th:0,sh:0,ft:90,ua:0,fa:0,ua2:0,fa2:0},{t:180,th:0,sh:0,ft:38,ua:0,fa:0,ua2:0,fa2:0}]},
  ab_wheel:{view:'side',g:'knees',props:['wheel'],frames:[{t:150,th:10,sh:-90,ft:0,ua:95,fa:125,ua2:95,fa2:125},{t:110,th:35,sh:-90,ft:0,ua:120,fa:120,ua2:120,fa2:120}]},
  plank:{view:'side',g:'fixed',hipY:0.52,props:[],frames:[{t:90,th:270,sh:270,ft:0,ua:5,fa:92,ua2:5,fa2:92},{t:91,th:270,sh:270,ft:0,ua:5,fa:92,ua2:5,fa2:92}]},
  cable_crunch:{view:'side',g:'knees',props:['cableHigh'],frames:[{t:170,th:10,sh:-90,ft:0,ua:160,fa:300,ua2:160,fa2:300},{t:120,th:10,sh:-90,ft:0,ua:160,fa:300,ua2:160,fa2:300}]},
  weighted_pullup:{view:'front',g:'hang',props:['bar','plateHip'],frames:[{t:180,th:0,sh:0,ua:150,fa:170},{t:180,th:0,sh:0,ua:40,fa:172}]},
  barbell_row:{view:'side',g:'feet',props:['barbellHand'],frames:[{t:130,th:10,sh:5,ua:0,fa:0,ua2:0,fa2:0},{t:130,th:10,sh:5,ua:300,fa:350,ua2:300,fa2:350}]},
  chest_supported_row:{view:'side',g:'bench',hipY:0.7,props:['benchProne','dumbbells'],frames:[{t:135,th:10,sh:0,ua:0,fa:0,ua2:0,fa2:0},{t:135,th:10,sh:0,ua:300,fa:0,ua2:300,fa2:0}]},
  lat_pulldown_neutral:{view:'front',g:'feet',props:['cableTop'],frames:[{t:180,th:0,sh:0,ua:165,fa:175},{t:180,th:0,sh:0,ua:40,fa:250}]},
  one_arm_cable_row:{view:'side',g:'bench',hipY:0.55,props:['cableFront','seatFlat'],frames:[{t:175,th:85,sh:70,ua:85,fa:85,ua2:50,fa2:60},{t:178,th:85,sh:70,ua:320,fa:60,ua2:50,fa2:60}]},
  face_pull:{view:'side',g:'feet',props:['cableFace'],frames:[{t:180,th:0,sh:0,ua:85,fa:85,ua2:85,fa2:85},{t:180,th:0,sh:0,ua:95,fa:170,ua2:95,fa2:170}]},
  incline_db_curl:{view:'side',g:'bench',hipY:0.75,props:['benchIncline','dumbbells'],frames:[{t:230,th:86,sh:5,ua:0,fa:0,ua2:0,fa2:0},{t:230,th:86,sh:5,ua:0,fa:150,ua2:0,fa2:150}]},
  hammer_curl:{view:'side',g:'feet',props:['dumbbells'],frames:[{t:180,th:0,sh:0,ua:5,fa:0,ua2:5,fa2:0},{t:180,th:0,sh:0,ua:5,fa:140,ua2:5,fa2:140}]},
  romanian_deadlift:{view:'side',g:'feet',props:['barbellHand'],frames:[{t:180,th:0,sh:0,ua:0,fa:0,ua2:0,fa2:0},{t:85,th:20,sh:-3,ua:0,fa:0,ua2:0,fa2:0}]},
  trap_bar_deadlift:{view:'side',g:'feet',props:['barbellHand'],frames:[{t:140,th:60,sh:-10,ua:0,fa:0,ua2:0,fa2:0},{t:180,th:0,sh:0,ua:0,fa:0,ua2:0,fa2:0}]},
  conventional_deadlift:{view:'side',g:'feet',props:['barbellHand'],frames:[{t:125,th:60,sh:-5,ua:0,fa:0,ua2:0,fa2:0},{t:180,th:0,sh:0,ua:0,fa:0,ua2:0,fa2:0}]},
  lying_leg_curl:{view:'side',g:'bench',hipY:0.7,props:['benchFlat','padAnkle'],frames:[{t:270,th:90,sh:90,ua:0,fa:0,ua2:0,fa2:0},{t:270,th:90,sh:215,ua:0,fa:0,ua2:0,fa2:0}]},
  hip_thrust:{view:'side',g:'feet',props:['benchShoulder','barbellHip'],frames:[{t:215,th:100,sh:20,ua:30,fa:20,ua2:30,fa2:20},{t:270,th:60,sh:0,ua:30,fa:20,ua2:30,fa2:20}]},
  db_shrug:{view:'front',g:'feet',props:['dumbbells'],frames:[{t:180,th:0,sh:0,ua:3,fa:3,shrug:0},{t:180,th:0,sh:0,ua:3,fa:3,shrug:1}]},
  dead_bug:{view:'side',g:'floor',props:[],frames:[{t:270,th:180,sh:90,th2:180,sh2:90,ua:180,fa:180,ua2:180,fa2:180},{t:270,th:180,sh:90,th2:100,sh2:95,ua:265,fa:265,ua2:180,fa2:180}]},
  pallof_press:{view:'side',g:'feet',props:['cableChest'],frames:[{t:180,th:0,sh:0,ua:30,fa:175,ua2:30,fa2:175},{t:180,th:0,sh:0,ua:88,fa:92,ua2:88,fa2:92}]},
  seated_db_press:{view:'front',g:'feet',props:['dumbbells'],frames:[{t:180,th:0,sh:0,ua:95,fa:178},{t:180,th:0,sh:0,ua:178,fa:178}]},
  push_up:{view:'side',g:'fixed',props:[],frames:[{t:90,th:255,sh:240,ft:0,ua:0,fa:0,ua2:0,fa2:0,hipY:0.96},{t:90,th:265,sh:262,ft:0,ua:290,fa:44,ua2:290,fa2:44,hipY:0.5}]},
  running:{view:'side',g:'fixed',hipY:1.45,cycle:'loop',dur:900,props:[],frames:[{t:172,th:60,sh:20,th2:-40,sh2:-120,ua:60,fa:150,ua2:-50,fa2:60},{t:172,th:20,sh:-10,th2:-10,sh2:-90,ua:10,fa:120,ua2:-10,fa2:90},{t:172,th:-40,sh:-120,th2:60,sh2:20,ua:-50,fa:60,ua2:60,fa2:150},{t:172,th:-10,sh:-90,th2:20,sh2:-10,ua:-10,fa:90,ua2:10,fa2:120}]}
};
const Anim={items:[],raf:null,U:46,W:240,H:200,FLOOR:172,CX:120};
function vA(a){const r=a*Math.PI/180;return [Math.sin(r),-Math.cos(r)];}
function lerpAng(a,b,u){let d=((b-a)%360+540)%360-180;return a+d*u;}
function easeIO(u){return u<0.5?2*u*u:1-Math.pow(-2*u+2,2)/2;}
function poseAt(def,u){
  const fr=def.frames,n=fr.length;let a,b,k;
  if(def.cycle==='loop'){const seg=u*n;const i=Math.floor(seg)%n;a=fr[i];b=fr[(i+1)%n];k=easeIO(seg-Math.floor(seg));}
  else{if(u<0.12){a=fr[0];b=fr[0];k=0;}else if(u<0.5){a=fr[0];b=fr[1];k=easeIO((u-0.12)/0.38);}else if(u<0.62){a=fr[1];b=fr[1];k=0;}else{a=fr[1];b=fr[0];k=easeIO((u-0.62)/0.38);}}
  const p={};const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){const x=a[key],y=b[key];if(x==null)p[key]=y;else if(y==null)p[key]=x;else if(key==='shrug'||key==='hipY')p[key]=x+(y-x)*k;else p[key]=lerpAng(x,y,k);}
  if(def.hipY!=null&&p.hipY==null)p.hipY=def.hipY;
  p._k=def.cycle==='loop'?0.5+0.5*Math.sin(u*Math.PI*2):(u<0.12?0:u<0.5?easeIO((u-0.12)/0.38):u<0.62?1:1-easeIO((u-0.62)/0.38));
  return p;
}
function joints(def,p){
  const side=def.view!=='front';const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];const mul=(a,s)=>[a[0]*s,a[1]*s];
  const J={};const sl=(p.shrug||0)*0.12;
  if(side){
    J.hip=[0,0];J.sh=add(J.hip,mul(vA(p.t),FIG.T+sl));J.head=add(J.sh,mul(vA(p.t+(p.hd||0)),FIG.N+FIG.HR));
    J.el=add(J.sh,mul(vA(p.ua),FIG.UA));J.ha=add(J.el,mul(vA(p.fa),FIG.FA));
    if(p.ua2!=null){J.el2=add(J.sh,mul(vA(p.ua2),FIG.UA));J.ha2=add(J.el2,mul(vA(p.fa2),FIG.FA));}
    const ft=p.ft==null?90:p.ft;J.kn=add(J.hip,mul(vA(p.th),FIG.TH));J.an=add(J.kn,mul(vA(p.sh),FIG.SH));J.toe=add(J.an,mul(vA(ft),FIG.FT));J.heel=add(J.an,mul(vA(ft+180),0.08));
    if(p.th2!=null){const ft2=p.ft2==null?90:p.ft2;J.kn2=add(J.hip,mul(vA(p.th2),FIG.TH));J.an2=add(J.kn2,mul(vA(p.sh2),FIG.SH));J.toe2=add(J.an2,mul(vA(ft2),FIG.FT));J.heel2=add(J.an2,mul(vA(ft2+180),0.08));}
  }else{
    const vf=(a,s)=>{const r=a*Math.PI/180;return [Math.sin(r)*s,-Math.cos(r)];};
    J.hip=[0,0];J.hipR=[FIG.HW,0];J.hipL=[-FIG.HW,0];J.shR=[FIG.SW,FIG.T+sl];J.shL=[-FIG.SW,FIG.T+sl];J.neck=[0,FIG.T+sl*0.5];J.head=[0,FIG.T+FIG.N+FIG.HR+sl*0.3];
    J.el=add(J.shR,mul(vf(p.ua,1),FIG.UA));J.ha=add(J.el,mul(vf(p.fa,1),FIG.FA));
    const ua2=p.ua2!=null?p.ua2:p.ua,fa2=p.fa2!=null?p.fa2:p.fa;J.el2=add(J.shL,mul(vf(ua2,-1),FIG.UA));J.ha2=add(J.el2,mul(vf(fa2,-1),FIG.FA));
    J.kn=add(J.hipR,mul(vf(p.th,1),FIG.TH));J.an=add(J.kn,mul(vf(p.sh,1),FIG.SH));J.kn2=add(J.hipL,mul(vf(p.th,-1),FIG.TH));J.an2=add(J.kn2,mul(vf(p.sh,-1),FIG.SH));
    J.toe=add(J.an,[0.12,-0.04]);J.toe2=add(J.an2,[-0.12,-0.04]);J.heel=J.an;J.heel2=J.an2;
  }
  return J;
}
function groundOffset(def,p,J){
  const U=Anim.U;let dy=0;
  switch(def.g){
    case 'feet':{let ys;if(def.view==='front')ys=[J.an[1],J.an2[1]];else{ys=[J.an[1],J.heel[1],J.toe[1]];if(J.an2&&def.key!=='bulgarian_split_squat')ys.push(J.an2[1],J.heel2[1],J.toe2[1]);}dy=-Math.min(...ys);break;}
    case 'toes':dy=-J.toe[1];break;
    case 'knees':dy=-J.kn[1]+0.08;break;
    case 'floor':dy=0.14;break;
    case 'bench':dy=p.hipY!=null?p.hipY:def.hipY;break;
    case 'fixed':dy=p.hipY!=null?p.hipY:def.hipY;break;
    case 'hang':{const hy=J.ha[1];dy=(Anim.FLOOR-24)/U-hy;break;}
  }
  return dy;
}
function toPx(pt,ox,oy){return [Anim.CX+ (pt[0]+ox)*Anim.U, Anim.FLOOR-(pt[1]+oy)*Anim.U];}
function seg(a,b,cls,w){return '<line class="'+cls+'" x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke-width="'+w+'"/>';}
function drawFigure(def,p,J,ox,oy){
  const P=k=>toPx(J[k],ox,oy);const side=def.view!=='front';let far='',near='';
  if(side){
    if(J.kn2){far+=seg(P('hip'),P('kn2'),'limb far',7)+seg(P('kn2'),P('an2'),'limb far',6.5)+seg(P('heel2'),P('toe2'),'limb far',5);}
    if(J.el2){far+=seg(P('sh'),P('el2'),'limb far',6)+seg(P('el2'),P('ha2'),'limb far',5.5);}
    near+=seg(P('hip'),P('sh'),'limb torso',10)+'<circle class="head" cx="'+P('head')[0].toFixed(1)+'" cy="'+P('head')[1].toFixed(1)+'" r="'+(FIG.HR*Anim.U).toFixed(1)+'"/>';
    near+=seg(P('hip'),P('kn'),'limb',7)+seg(P('kn'),P('an'),'limb',6.5)+seg(P('heel'),P('toe'),'limb',5);
    near+=seg(P('sh'),P('el'),'limb',6)+seg(P('el'),P('ha'),'limb',5.5);
    for(const k of ['sh','el','kn','hip'])near+='<circle class="joint" cx="'+P(k)[0].toFixed(1)+'" cy="'+P(k)[1].toFixed(1)+'" r="2.6"/>';
  }else{
    const sr=P('shR'),sl=P('shL'),hr=P('hipR'),hl=P('hipL');
    near+='<path class="torso-f" d="M'+sl[0].toFixed(1)+' '+sl[1].toFixed(1)+' L'+sr[0].toFixed(1)+' '+sr[1].toFixed(1)+' L'+hr[0].toFixed(1)+' '+hr[1].toFixed(1)+' L'+hl[0].toFixed(1)+' '+hl[1].toFixed(1)+' Z"/>';
    near+=seg(P('neck'),P('head'),'limb',7)+'<circle class="head" cx="'+P('head')[0].toFixed(1)+'" cy="'+P('head')[1].toFixed(1)+'" r="'+(FIG.HR*Anim.U).toFixed(1)+'"/>';
    near+=seg(P('hipR'),P('kn'),'limb',7)+seg(P('kn'),P('an'),'limb',6.5)+seg(P('an'),P('toe'),'limb',5)+seg(P('hipL'),P('kn2'),'limb',7)+seg(P('kn2'),P('an2'),'limb',6.5)+seg(P('an2'),P('toe2'),'limb',5);
    near+=seg(P('shR'),P('el'),'limb',6)+seg(P('el'),P('ha'),'limb',5.5)+seg(P('shL'),P('el2'),'limb',6)+seg(P('el2'),P('ha2'),'limb',5.5);
    for(const k of ['shR','shL','el','el2','kn','kn2'])near+='<circle class="joint" cx="'+P(k)[0].toFixed(1)+'" cy="'+P(k)[1].toFixed(1)+'" r="2.6"/>';
  }
  return far+near;
}
function drawProps(def,p,J,ox,oy,fixed){
  const P=k=>toPx(J[k],ox,oy);const U=Anim.U;const F=Anim.FLOOR;let g='';const props=def.props||[];const side=def.view!=='front';
  const plate=(c,r)=>'<circle class="plate" cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+r+'"/><circle class="plate-in" cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+(r*0.35).toFixed(1)+'"/>';
  const db=(hand,dirPt)=>{const d=[dirPt[0]-hand[0],dirPt[1]-hand[1]];const l=Math.hypot(d[0],d[1])||1;const n=[-d[1]/l,d[0]/l];const a=[hand[0]-n[0]*7,hand[1]-n[1]*7],b=[hand[0]+n[0]*7,hand[1]+n[1]*7];return seg(a,b,'iron',4)+'<circle class="plate" cx="'+a[0].toFixed(1)+'" cy="'+a[1].toFixed(1)+'" r="3.6"/><circle class="plate" cx="'+b[0].toFixed(1)+'" cy="'+b[1].toFixed(1)+'" r="3.6"/>';};
  const cable=(hand,to)=>{const t=toPx(to,fixed.ox,fixed.oy);return seg(hand,t,'cable',1.6)+'<circle class="pulley" cx="'+t[0].toFixed(1)+'" cy="'+t[1].toFixed(1)+'" r="4"/>';};
  for(const pr of props){
    if(pr==='dumbbells'){g+=db(P('ha'),P('el'));if(J.ha2)g+=db(P('ha2'),P('el2'));}
    else if(pr==='barbellHand'){g+=plate(P('ha'),11);}
    else if(pr==='barbellShoulder'){const s=P('sh');g+=plate([s[0]-5,s[1]-3],11);}
    else if(pr==='barbellFront'){const s=P('sh');g+=plate([s[0]+6,s[1]-2],11);}
    else if(pr==='barbellHip'){const h=P('hip');g+=plate([h[0]+2,h[1]-7],11);}
    else if(pr==='plateHip'){const h=P('hip');g+='<line class="cable" x1="'+h[0]+'" y1="'+h[1]+'" x2="'+h[0]+'" y2="'+(h[1]+14)+'" stroke-width="1.6"/>'+plate([h[0],h[1]+22],8);}
    else if(pr==='bar'){g+='<line class="iron" x1="12" y1="24" x2="'+(Anim.W-12)+'" y2="24" stroke-width="4"/>';}
    else if(pr==='wheel'){g+='<circle class="plate" cx="'+P('ha')[0].toFixed(1)+'" cy="'+P('ha')[1].toFixed(1)+'" r="7"/>';}
    else if(pr==='padAnkle'){const a=P('an');g+='<rect class="pad" x="'+(a[0]-5)+'" y="'+(a[1]-6)+'" width="10" height="12" rx="3"/>';}
    else if(pr==='sled'){const t=P('toe'),a=P('an');const d=[t[0]-a[0],t[1]-a[1]];const l=Math.hypot(d[0],d[1])||1;const n=[d[0]/l,d[1]/l];g+=seg([t[0]+n[0]*4-n[1]*24,t[1]+n[1]*4+n[0]*24],[t[0]+n[0]*4+n[1]*24,t[1]+n[1]*4-n[0]*24],'pad',6);}
    else if(pr==='cableBackLow'){g+=cable(P('ha'),[-1.5,-0.1]);}
    else if(pr==='cableHigh'){g+=cable(P('ha'),[0.4,2.7]);}
    else if(pr==='cableFront'){g+=cable(P('ha'),[2.2,0.9]);}
    else if(pr==='cableFace'){g+=cable(P('ha'),[2.1,1.6]);}
    else if(pr==='cableChest'){g+=cable(P('ha'),[1.9,0.55]);}
    else if(pr==='cableTop'){g+=cable(P('ha'),[0.9,2.9])+cable(P('ha2'),[-0.9,2.9]);}
    else if(pr==='cableLowBoth'){g+=cable(P('ha'),[1.9,-0.3])+cable(P('ha2'),[-1.9,-0.3]);}
  }
  return g;
}
function drawStatic(def,fixed){
  // props that stay fixed (benches, boxes, floor) are drawn from the first frame's joints
  const U=Anim.U,F=Anim.FLOOR;let g='';const props=def.props||[];const J=fixed.J,ox=fixed.ox,oy=fixed.oy;const P=k=>toPx(J[k],ox,oy);const p=fixed.p;
  const padAlong=(a,b,off)=>{const d=[b[0]-a[0],b[1]-a[1]];const l=Math.hypot(d[0],d[1])||1;const n=[-d[1]/l*off,d[0]/l*off];return seg([a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],'pad',9);};
  if(def.g!=='hang')g+='<line class="floor" x1="10" y1="'+F+'" x2="'+(Anim.W-10)+'" y2="'+F+'"/>';
  for(const pr of props){
    if(pr==='benchIncline'){const h=P('hip'),s=P('sh'),ext=[s[0]+(s[0]-h[0])*0.25,s[1]+(s[1]-h[1])*0.25];g+=padAlong(h,ext,8)+padAlong(h,[h[0]+34,h[1]],-9)+'<line class="pad" x1="'+(h[0]+14)+'" y1="'+(h[1]+12)+'" x2="'+(h[0]+14)+'" y2="'+F+'" stroke-width="5"/>';}
    else if(pr==='benchFlat'){const h=P('hip'),s=P('sh');g+=padAlong([h[0]+16,h[1]],[s[0]-16,s[1]],-9)+'<line class="pad" x1="'+(h[0]-18)+'" y1="'+(h[1]+12)+'" x2="'+(h[0]-18)+'" y2="'+F+'" stroke-width="5"/>'+'<line class="pad" x1="'+(s[0]-10)+'" y1="'+(s[1]+12)+'" x2="'+(s[0]-10)+'" y2="'+F+'" stroke-width="5"/>';}
    else if(pr==='benchProne'){const h=P('hip'),s=P('sh');g+=padAlong(h,s,9)+'<line class="pad" x1="'+(h[0]+10)+'" y1="'+(h[1]+6)+'" x2="'+(h[0]+10)+'" y2="'+F+'" stroke-width="5"/>';}
    else if(pr==='seat'){const h=P('hip'),s=P('sh');g+=padAlong(h,s,8)+'<line class="pad" x1="'+(h[0]-14)+'" y1="'+(h[1]+8)+'" x2="'+(h[0]+16)+'" y2="'+(h[1]+8)+'" stroke-width="9"/><line class="pad" x1="'+h[0]+'" y1="'+(h[1]+12)+'" x2="'+h[0]+'" y2="'+F+'" stroke-width="5"/>';}
    else if(pr==='seatFlat'){const h=P('hip');g+='<line class="pad" x1="'+(h[0]-18)+'" y1="'+(h[1]+8)+'" x2="'+(h[0]+18)+'" y2="'+(h[1]+8)+'" stroke-width="9"/><line class="pad" x1="'+h[0]+'" y1="'+(h[1]+12)+'" x2="'+h[0]+'" y2="'+F+'" stroke-width="5"/>';}
    else if(pr==='box'){const t=P('toe2');g+='<rect class="pad" x="'+(t[0]-16)+'" y="'+(t[1]+2)+'" width="32" height="'+Math.max(6,F-t[1]-2)+'" rx="3"/>';}
    else if(pr==='benchShoulder'){const s=toPx(fixed.JB.sh,ox,oy);g+='<rect class="pad" x="'+(s[0]-22)+'" y="'+(s[1]+6)+'" width="30" height="'+Math.max(6,F-s[1]-6)+'" rx="3"/>';}
  }
  return g;
}
function drawAnim(def,u){
  const p=poseAt(def,u);const J=joints(def,p);const oy=groundOffset(def,p,J);
  const fixed=def._fixed;const ox=fixed.ox;
  return drawStatic(def,fixed)+drawProps(def,p,J,ox,oy,fixed)+drawFigure(def,p,J,ox,oy);
}
function prepAnim(key){
  const def=ANIMS[key];if(!def)return null;if(def._fixed)return def;def.key=key;
  const fr=def.frames;let minx=1e9,maxx=-1e9;const fixedJ=[];
  fr.forEach((f,i)=>{const p={...f};if(def.hipY!=null&&p.hipY==null)p.hipY=def.hipY;const J=joints(def,p);const oy=groundOffset(def,p,J);fixedJ.push({J,oy,p});for(const k in J){const pt=J[k];if(!pt)continue;minx=Math.min(minx,pt[0]);maxx=Math.max(maxx,pt[0]);}});
  let ox=-(minx+maxx)/2;if(def.g==='hang')ox=-(fr.map(f=>joints(def,f).ha[0]).reduce((a,b)=>a+b,0)/fr.length);
  def._fixed={ox,oy:fixedJ[0].oy,J:fixedJ[0].J,JB:fixedJ[1]?fixedJ[1].J:fixedJ[0].J,p:fixedJ[0].p};
  return def;
}
function illusCard(exKey,opts){const il=ILLUS&&ILLUS[exKey];if(!il||!il.a||!il.b)return '';const ex=EXERCISES[exKey]||{};opts=opts||{};
  return '<div class="demo illus'+(opts.large?' large':'')+'" data-illus="'+esc(exKey)+'" role="img" aria-label="'+esc(ex.name||exKey)+', start and finish positions"><div class="frames"><img class="fa" src="'+esc(il.a)+'" alt="Start position" loading="lazy"><img class="fb" src="'+esc(il.b)+'" alt="Finish position" loading="lazy"><span class="ph pa">Position 1</span><span class="ph pb">Position 2</span></div>'+(opts.caption!==false?'<div class="demo-cap"><span class="pill bronze">'+esc(ex.tempo||'Smooth, controlled')+'</span><span class="muted small">'+(ILLUS_NOTES[exKey]?'tap to pause · see note':'tap to pause')+'</span></div>':'')+'</div>';}
function demoCard(exKey,opts){
  opts=opts||{};if(!opts.force3d){const ic=illusCard(exKey,opts);if(ic)return ic;}
  const ex=EXERCISES[exKey]||{};const key=ex.anim||exKey;const def=ANIMS[key];
  if(!def)return '';
  return '<div class="demo'+(opts.large?' large':'')+'" data-anim="'+key+'" data-ex="'+esc(exKey)+'" role="img" aria-label="Animated demonstration of '+esc(ex.name||key)+'"><svg viewBox="0 0 '+Anim.W+' '+Anim.H+'"></svg><canvas class="gl3d" width="'+(GL.W*2)+'" height="'+(GL.H*2)+'" hidden></canvas>'+(opts.caption!==false?'<div class="demo-cap"><span class="pill bronze">'+esc(ex.tempo||'Smooth, controlled')+'</span><span class="muted small">'+(opts.large?'marble athlete · working muscles in bronze · ':'')+'tap to pause</span></div>':'')+'</div>';
}
Anim.mount=function(){
  $$('.demo.illus').forEach(el=>{if(!el._bound){el._bound=true;el.addEventListener('click',()=>el.classList.toggle('paused'));}});
  Anim.items=[];if(!GL.ready&&!GL.failed)GL.init();const els=$$('[data-anim]');for(const el of els){const def=prepAnim(el.dataset.anim);if(!def)continue;const cv=$('canvas.gl3d',el);const item={el,def,svg:$('svg',el),canvas:cv,ctx:cv?cv.getContext('2d'):null,active:activeMuscles(el.dataset.ex||el.dataset.anim),t0:performance.now()-Math.random()*800,phase:Math.random()*6,paused:false,visible:true,last:-1};Anim.items.push(item);
    if(!el._bound){el._bound=true;el.addEventListener('click',()=>{item.paused=!item.paused;item.drawnPaused=false;item.last=-1;el.classList.toggle('paused',item.paused);if(item.paused)item.pausedAt=performance.now();else item.t0+=performance.now()-item.pausedAt;});}
    item.svg.innerHTML=drawAnim(def,0);}
  if(Anim.io)Anim.io.disconnect();
  if('IntersectionObserver' in window){Anim.io=new IntersectionObserver(entries=>{for(const e of entries){const it=Anim.items.find(i=>i.el===e.target);if(it)it.visible=e.isIntersecting;}});Anim.items.forEach(i=>Anim.io.observe(i.el));}
  if(!Anim.raf)Anim.loop();
};
Anim.reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
Anim.loop=function(){
  Anim.raf=requestAnimationFrame(Anim.loop);const now=performance.now();
  const use3d=GL.ready&&!GL.failed;
  for(const it of Anim.items){if(!it.visible||!document.contains(it.el))continue;const dur=it.def.dur||2600;let u=((now-it.t0)%dur)/dur;if(Anim.reduce)u=Math.floor(u*2)/2===0?0.05:0.55;if(it.paused&&it.drawnPaused)continue;
    if(use3d&&it.ctx){if(it.svg&&it.svg.style.display!=='none'){it.svg.style.display='none';it.canvas.hidden=false;}const q=Math.round(u*80);if(q===it.last&&!it.paused)continue;it.last=q;try{GL.render(it.def,u,it.phase,it.active);it.ctx.clearRect(0,0,it.canvas.width,it.canvas.height);it.ctx.drawImage(GL.renderer.domElement,0,0,it.canvas.width,it.canvas.height);}catch(e){console.warn(e);GL.failed=true;}}
    else{const q=Math.round(u*120);if(q===it.last)continue;it.last=q;it.svg.innerHTML=drawAnim(it.def,u);}
    it.drawnPaused=it.paused;}
};

// ===================== 3D STATUE DEMOS (WebGL, falls back to the 2D figure) =====================
// One shared renderer draws every visible demo in turn; each card shows the result on its own canvas.
const GL={ready:false,failed:false,W:360,H:300,mats:{},muscles:[],props:{},t0:performance.now()};
const MUSCLE_KEYS={chest:['chest'],'upper chest':['chest'],delt:['delts'],shoulder:['delts'],triceps:['triceps'],biceps:['biceps'],brachialis:['biceps'],lat:['lats'],'mid back':['lats','traps'],'back':['lats'],rhomboid:['traps'],trap:['traps'],'rear delt':['delts'],abs:['abs'],core:['abs'],oblique:['abs'],glute:['glutes'],quad:['quads'],hamstring:['hamstrings'],'lower back':['lowerback'],calf:['calves'],calves:['calves'],forearm:['forearms'],grip:['forearms'],adductor:['quads'],'posterior chain':['hamstrings','glutes','lowerback'],'hip flexor':['quads'],conditioning:[],balance:[]};
function activeMuscles(exKey){const set=new Set();if(exKey==='running'||exKey==='hill_sprints'||exKey==='running_strides'){['quads','hamstrings','glutes','calves'].forEach(x=>set.add(x));return set;}const ex=EXERCISES[exKey];if(!ex)return set;const txt=(ex.muscles||'').toLowerCase();for(const [k,v] of Object.entries(MUSCLE_KEYS)){if(txt.includes(k))v.forEach(x=>set.add(x));}return set;}
function rearView(act){if(!act||!act.size)return false;const back=['lats','traps','glutes','hamstrings','calves','lowerback'],frontM=['chest','abs','quads','biceps','delts','forearms'];let b=0,f=0;for(const m of act){if(back.includes(m))b+=(m==='lats'?2:1);if(frontM.includes(m))f++;}return b>0&&b>=f;}
GL.init=function(){
  if(GL.ready||GL.failed)return;if(!window.THREE){return;}
  try{
    const r=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));r.setSize(GL.W,GL.H,false);
    if('outputColorSpace' in r)r.outputColorSpace=THREE.SRGBColorSpace;else if('outputEncoding' in r)r.outputEncoding=THREE.sRGBEncoding;
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;GL.renderer=r;
    const sc=new THREE.Scene();GL.scene=sc;
    sc.add(new THREE.HemisphereLight(0xF2EEE6,0x15110C,0.55));
    const key=new THREE.DirectionalLight(0xFFF0D2,1.35);key.position.set(2.5,4.5,3.5);sc.add(key);
    const fill=new THREE.DirectionalLight(0x9DB1D6,0.35);fill.position.set(-3,1.5,2.5);sc.add(fill);
    const rim=new THREE.DirectionalLight(0xD9A24A,0.9);rim.position.set(-2.5,3,-4);sc.add(rim);
    GL.camera=new THREE.PerspectiveCamera(34,GL.W/GL.H,0.1,50);
    const M=GL.mats;M.marble=new THREE.MeshStandardMaterial({color:0xD6D1C6,roughness:0.58,metalness:0.06});M.marbleDark=new THREE.MeshStandardMaterial({color:0xB9B3A6,roughness:0.6,metalness:0.06});
    M.active=new THREE.MeshStandardMaterial({color:0xD9A24A,emissive:0x9A5E12,emissiveIntensity:0.35,roughness:0.38,metalness:0.35});
    M.iron=new THREE.MeshStandardMaterial({color:0x4A5160,roughness:0.35,metalness:0.75});M.plate=new THREE.MeshStandardMaterial({color:0x1B2027,roughness:0.5,metalness:0.6});
    M.bench=new THREE.MeshStandardMaterial({color:0x4F5868,roughness:0.85,metalness:0.1});M.cable=new THREE.LineBasicMaterial({color:0xA7A39A});
    GL.buildFigure();GL.buildProps();
    const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');const gr=g.createRadialGradient(128,128,10,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
    const tex=new THREE.CanvasTexture(c);GL.floor=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));GL.floor.rotation.x=-Math.PI/2;GL.floor.position.y=0.005;sc.add(GL.floor);
    GL.ready=true;
  }catch(e){console.warn('3D unavailable',e);GL.failed=true;}
};
GL.mesh=function(geo,mat,muscle){const m=new THREE.Mesh(geo,mat);if(muscle){m.userData.muscle=muscle;GL.muscles.push(m);}return m;};
GL.capsule=function(r1,r2,len,mat,group){const cyl=GL.mesh(new THREE.CylinderGeometry(r2,r1,Math.max(0.01,len),20,1),mat);cyl.position.y=len/2;group.add(cyl);const s1=GL.mesh(new THREE.SphereGeometry(r1,18,14),mat);group.add(s1);const s2=GL.mesh(new THREE.SphereGeometry(r2,18,14),mat);s2.position.y=len;group.add(s2);};
GL.bulge=function(group,muscle,x,y,z,r,sx,sy,sz){const m=GL.mesh(new THREE.SphereGeometry(r,18,14),GL.mats.marble,muscle);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.base=GL.mats.marble;group.add(m);return m;};
GL.buildFigure=function(){
  const F=FIG,G={};const grp=()=>{const g=new THREE.Group();GL.scene.add(g);return g;};
  // torso: lathe profile from hip (y=0) to shoulders (y=T)
  const prof=[[0.24,0],[0.29,0.1],[0.29,0.28],[0.33,0.5],[0.40,0.74],[0.43,0.9],[0.38,1.0],[0.16,1.06]].map(p=>new THREE.Vector2(p[0],p[1]));
  G.torso=grp();const tor=GL.mesh(new THREE.LatheGeometry(prof,28),GL.mats.marble);tor.scale.set(1,1,0.62);G.torso.add(tor);
  for(const s of [1,-1]){GL.bulge(G.torso,'chest',0.19*s,0.80,0.2,0.17,1,0.7,0.55);GL.bulge(G.torso,'lats',0.33*s,0.6,-0.08,0.17,0.5,1.35,0.6);GL.bulge(G.torso,'traps',0.2*s,1.02,-0.03,0.13,1.5,0.55,0.9);GL.bulge(G.torso,'lowerback',0.09*s,0.3,-0.17,0.1,0.8,1.6,0.5);GL.bulge(G.torso,'abs',0.27*s,0.46,0.08,0.1,0.6,1.6,0.6);for(const row of [0.33,0.47,0.61])GL.bulge(G.torso,'abs',0.075*s,row,0.195,0.075,1,0.8,0.45);}
  G.pelvis=grp();const pel=GL.mesh(new THREE.SphereGeometry(0.25,20,16),GL.mats.marble);pel.scale.set(1.25,0.6,0.85);pel.position.y=-0.02;G.pelvis.add(pel);for(const s of [1,-1])GL.bulge(G.pelvis,'glutes',0.14*s,-0.08,-0.18,0.17,1,0.9,0.75);
  G.neck=grp();GL.capsule(0.08,0.085,F.N+0.06,GL.mats.marble,G.neck);
  G.head=grp();const hd=GL.mesh(new THREE.SphereGeometry(F.HR,22,18),GL.mats.marble);hd.scale.set(0.86,1.05,1);G.head.add(hd);const jaw=GL.mesh(new THREE.SphereGeometry(0.11,14,12),GL.mats.marble);jaw.position.set(0,-0.1,0.08);jaw.scale.set(1,0.8,1);G.head.add(jaw);
  const arm=(side)=>{const ua=grp();GL.capsule(0.09,0.08,F.UA,GL.mats.marble,ua);GL.bulge(ua,'biceps',0,0.46*F.UA,0.075,0.085,0.9,1.7,0.8);GL.bulge(ua,'triceps',0,0.5*F.UA,-0.085,0.085,0.9,1.8,0.75);const d=GL.bulge(ua,'delts',0.03*side,0.02,0,0.165,1,1,1);
    const fa=grp();GL.capsule(0.078,0.058,F.FA,GL.mats.marble,fa);GL.bulge(fa,'forearms',0,0.3*F.FA,0.03,0.07,1,1.6,0.9);const hand=GL.mesh(new THREE.SphereGeometry(0.068,14,12),GL.mats.marble);hand.position.y=F.FA;hand.scale.set(1,1.1,0.7);fa.add(hand);return {ua,fa};};
  G.armR=arm(1);G.armL=arm(-1);
  const leg=()=>{const th=grp();GL.capsule(0.14,0.11,F.TH,GL.mats.marble,th);GL.bulge(th,'quads',0,0.42*F.TH,0.09,0.12,1,1.9,0.8);GL.bulge(th,'hamstrings',0,0.5*F.TH,-0.095,0.11,1,1.8,0.7);
    const sh=grp();GL.capsule(0.095,0.062,F.SH,GL.mats.marble,sh);GL.bulge(sh,'calves',0,0.3*F.SH,-0.075,0.09,1,1.5,0.85);const ft=grp();const foot=GL.mesh(new THREE.BoxGeometry(0.11,0.07,F.FT+0.12),GL.mats.marbleDark);foot.position.set(0,-0.03,F.FT/2-0.02);ft.add(foot);return {th,sh,ft};};
  G.legR=leg();G.legL=leg();
  GL.G=G;
};
GL.orient=function(group,a,b,scaleLen){const dir=new THREE.Vector3().subVectors(b,a);const len=dir.length();if(len<1e-6)return;dir.normalize();let fwd=new THREE.Vector3(0,0,1);fwd.sub(dir.clone().multiplyScalar(fwd.dot(dir)));if(fwd.lengthSq()<0.02){fwd=new THREE.Vector3(0,1,0);fwd.sub(dir.clone().multiplyScalar(fwd.dot(dir)));}fwd.normalize();const right=new THREE.Vector3().crossVectors(dir,fwd).normalize();const m=new THREE.Matrix4().makeBasis(right,dir,fwd);group.quaternion.setFromRotationMatrix(m);group.position.copy(a);};
GL.buildProps=function(){
  const P=GL.props,M=GL.mats;const add=(o)=>{o.visible=false;GL.scene.add(o);return o;};
  const barbell=()=>{const g=new THREE.Group();const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1.75,12),M.iron);bar.rotation.z=Math.PI/2;g.add(bar);for(const s of [1,-1]){const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.21,0.05,24),M.plate);pl.rotation.z=Math.PI/2;pl.position.x=0.72*s;g.add(pl);const rim=new THREE.Mesh(new THREE.TorusGeometry(0.21,0.012,8,32),M.iron);rim.rotation.y=Math.PI/2;rim.position.x=0.72*s;g.add(rim);}return add(g);};
  P.barbellHand=barbell();P.barbellShoulder=barbell();P.barbellFront=barbell();P.barbellHip=barbell();
  const db=()=>{const g=new THREE.Group();const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.26,10),M.iron);bar.rotation.z=Math.PI/2;g.add(bar);for(const s of [1,-1]){const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.06,18),M.plate);pl.rotation.z=Math.PI/2;pl.position.x=0.11*s;g.add(pl);}return add(g);};
  P.db1=db();P.db2=db();
  P.bar=add(new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,2.4,12),M.iron));P.bar.rotation.z=Math.PI/2;
  P.plateHip=add(new THREE.Group());{const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.04,20),M.plate);pl.rotation.z=Math.PI/2;pl.position.y=-0.5;P.plateHip.add(pl);const chain=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.4,8),M.iron);chain.position.y=-0.25;P.plateHip.add(chain);}
  const box=(w,h,d,mat)=>add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||M.bench));
  P.benchBack=box(0.38,0.08,1.3);P.benchSeat=box(0.38,0.08,0.55);P.benchStand=box(0.08,1,0.08,M.plate);P.benchStand2=box(0.08,1,0.08,M.plate);P.box=box(0.4,0.75,0.4);P.sled=box(0.9,0.06,0.5,M.plate);P.pad=box(0.16,0.16,0.12);
  P.wheel=add(new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.14,20),M.plate));P.wheel.rotation.z=Math.PI/2;
  P.cable1=add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,1,0)]),M.cable));P.cable2=add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,1,0)]),M.cable));
  P.pulley1=add(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.06,16),M.iron));P.pulley1.rotation.z=Math.PI/2;P.pulley2=add(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.06,16),M.iron));P.pulley2.rotation.z=Math.PI/2;
};
GL.v3=function(def,pt,lat,ox,oy){if(def.view==='front')return new THREE.Vector3(pt[0],pt[1]+oy,0);return new THREE.Vector3(lat,pt[1]+oy,pt[0]+ox);};
GL.pose=function(def,p,J,ox,oy,k,act){
  const G=GL.G,F=FIG,front=def.view==='front';const V=(pt,lat)=>GL.v3(def,pt,lat||0,ox,oy);
  const hip=V(J.hip),sh=V(J.sh||J.neck);GL.orient(G.torso,hip,sh);GL.orient(G.pelvis,hip,sh);
  const headC=V(J.head);const neckBase=sh.clone();GL.orient(G.neck,neckBase,headC);G.head.position.copy(headC);G.head.quaternion.copy(G.neck.quaternion);
  const shR=front?V(J.shR):V(J.sh,0.44),shL=front?V(J.shL):V(J.sh,-0.44);
  const elR=front?V(J.el):V(J.el,0.46),haR=front?V(J.ha):V(J.ha,0.46);GL.orient(G.armR.ua,shR,elR);GL.orient(G.armR.fa,elR,haR);
  const hasArm2=J.el2!=null;const elL=hasArm2?(front?V(J.el2):V(J.el2,-0.46)):new THREE.Vector3(-0.46,elR.y,elR.z),haL=hasArm2?(front?V(J.ha2):V(J.ha2,-0.46)):new THREE.Vector3(-0.46,haR.y,haR.z);
  GL.orient(G.armL.ua,shL,elL);GL.orient(G.armL.fa,elL,haL);
  const hipR=front?V(J.hipR):V(J.hip,0.16),hipL=front?V(J.hipL):V(J.hip,-0.16);
  const knR=front?V(J.kn):V(J.kn,0.17),anR=front?V(J.an):V(J.an,0.17),toeR=front?V(J.toe):V(J.toe,0.17);GL.orient(G.legR.th,hipR,knR);GL.orient(G.legR.sh,knR,anR);GL.orient(G.legR.ft,anR,toeR);
  const hasLeg2=J.kn2!=null;const knL=hasLeg2?(front?V(J.kn2):V(J.kn2,-0.17)):new THREE.Vector3(-0.17,knR.y,knR.z),anL=hasLeg2?(front?V(J.an2):V(J.an2,-0.17)):new THREE.Vector3(-0.17,anR.y,anR.z),toeL=hasLeg2?(front?V(J.toe2):V(J.toe2,-0.17)):new THREE.Vector3(-0.17,toeR.y,toeR.z);
  GL.orient(G.legL.th,hipL,knL);GL.orient(G.legL.sh,knL,anL);GL.orient(G.legL.ft,anL,toeL);
  // props
  const P=GL.props;for(const key in P)P[key].visible=false;
  const mid=(a,b)=>a.clone().add(b).multiplyScalar(0.5);const props=def.props||[];
  const show=(o,pos)=>{o.visible=true;if(pos)o.position.copy(pos);};
  const handMid=mid(haR,haL);handMid.x=0;
  for(const pr of props){
    if(pr==='barbellHand')show(P.barbellHand,handMid);
    else if(pr==='barbellShoulder')show(P.barbellShoulder,sh.clone().add(new THREE.Vector3(0,0.06,-0.1)));
    else if(pr==='barbellFront')show(P.barbellFront,sh.clone().add(new THREE.Vector3(0,0.04,0.14)));
    else if(pr==='barbellHip')show(P.barbellHip,hip.clone().add(new THREE.Vector3(0,0.2,0.04)));
    else if(pr==='plateHip')show(P.plateHip,hip.clone());
    else if(pr==='dumbbells'){show(P.db1,haR);P.db1.quaternion.copy(G.armR.fa.quaternion);show(P.db2,haL);P.db2.quaternion.copy(G.armL.fa.quaternion);}
    else if(pr==='bar'){show(P.bar,new THREE.Vector3(0,haR.y,haR.z));}
    else if(pr==='wheel'){show(P.wheel,handMid);}
    else if(pr==='padAnkle'){show(P.pad,anR.clone().add(new THREE.Vector3(0,0,0)));P.pad.scale.set(2.6,1,1);}
    else if(pr==='sled'){const n=toeR.clone().sub(anR).normalize();show(P.sled,mid(toeR,toeL).add(n.multiplyScalar(0.12)));P.sled.quaternion.copy(G.legR.ft.quaternion);P.sled.rotation.x+=Math.PI/2;}
    else if(pr==='box'){show(P.box,new THREE.Vector3(toeL.x,anL.y/2-0.02,toeL.z-0.02));P.box.scale.set(1,Math.max(0.05,(anL.y-0.03)/0.75),1);}
    else if(pr==='benchIncline'||pr==='benchProne'||pr==='seat'){const back=pr==='benchProne'?0.17:-0.16;const q=G.torso.quaternion;const off=new THREE.Vector3(0,0,back).applyQuaternion(q);const c=mid(hip,sh).add(off).add(new THREE.Vector3(0,0,0.0));show(P.benchBack,c);P.benchBack.quaternion.copy(q);P.benchBack.rotation.x+=Math.PI/2;
      if(pr!=='benchProne'){const seatC=hip.clone().add(new THREE.Vector3(0,-0.13,0.26));show(P.benchSeat,seatC);P.benchSeat.quaternion.set(0,0,0,1);show(P.benchStand,new THREE.Vector3(0,seatC.y/2,seatC.z+0.1));P.benchStand.scale.set(1,Math.max(0.05,seatC.y-0.04),1);}
      else{const st=mid(hip,sh).add(off);show(P.benchStand,new THREE.Vector3(0,st.y/2,st.z));P.benchStand.scale.set(1,Math.max(0.05,st.y-0.05),1);}}
    else if(pr==='benchFlat'||pr==='seatFlat'){const c=pr==='benchFlat'?mid(hip,sh):hip.clone();c.y-=0.16;show(P.benchBack,c);P.benchBack.quaternion.set(0,0,0,1);P.benchBack.rotation.y=Math.PI/2;P.benchBack.scale.set(pr==='benchFlat'?1:0.5,1,1);show(P.benchStand,new THREE.Vector3(0,c.y/2-0.02,c.z-0.45));P.benchStand.scale.set(1,Math.max(0.05,c.y-0.06),1);show(P.benchStand2,new THREE.Vector3(0,c.y/2-0.02,c.z+0.45));P.benchStand2.scale.set(1,Math.max(0.05,c.y-0.06),1);}
    else if(pr==='benchShoulder'){const sB=GL.v3(def,def._fixed.JB.sh,0,ox,oy);show(P.box,new THREE.Vector3(0,(sB.y-0.1)/2,sB.z-0.1));P.box.scale.set(1,Math.max(0.05,(sB.y-0.12)/0.75),1);}
    else if(pr.startsWith('cable')){const anchors={cableBackLow:[-1.5,-0.1],cableHigh:[0.4,2.7],cableFront:[2.2,0.9],cableFace:[2.1,1.6],cableChest:[1.9,0.55]};
      const draw=(line,pul,from,to)=>{line.visible=true;line.geometry.setFromPoints([from,to]);pul.visible=true;pul.position.copy(to);};
      if(pr==='cableTop'){draw(P.cable1,P.pulley1,haR,new THREE.Vector3(haR.x,oy+2.9,0));draw(P.cable2,P.pulley2,haL,new THREE.Vector3(haL.x,oy+2.9,0));}
      else if(pr==='cableLowBoth'){draw(P.cable1,P.pulley1,haR,new THREE.Vector3(1.9,oy-0.3,0));draw(P.cable2,P.pulley2,haL,new THREE.Vector3(-1.9,oy-0.3,0));}
      else{const a=anchors[pr];if(a){const to=new THREE.Vector3(0.2,a[1]+oy,a[0]+ox);draw(P.cable1,P.pulley1,haR,to);draw(P.cable2,P.pulley2,haL,to.clone().setX(-0.2));}}}
  }
  // muscle highlight
  const I=0.25+0.6*k;GL.mats.active.emissiveIntensity=I;
  for(const m of GL.muscles){const on=act&&act.has(m.userData.muscle);m.material=on?GL.mats.active:(m.userData.base||GL.mats.marble);}
};
GL.render=function(def,u,phase,active){
  if(!GL.ready)return false;const p=poseAt(def,u);const J=joints(def,p);const oy=groundOffset(def,p,J);const fx=def._fixed;
  GL.pose(def,p,J,fx.ox,oy,p._k||0,active||new Set());
  // camera: slow orbit around the figure's centre
  if(!def._cam){let miny=1e9,maxy=-1e9,minz=1e9,maxz=-1e9;for(const f of def.frames){const pp={...f};if(def.hipY!=null&&pp.hipY==null)pp.hipY=def.hipY;const JJ=joints(def,pp);const o=groundOffset(def,pp,JJ);for(const kk in JJ){const pt=JJ[kk];if(!pt)continue;const y=pt[1]+o,z=def.view==='front'?0:pt[0]+fx.ox;miny=Math.min(miny,y);maxy=Math.max(maxy,y);minz=Math.min(minz,z);maxz=Math.max(maxz,z);}}
    const ext=Math.max(maxy-miny+0.5,maxz-minz+0.9,2.0);def._cam={cy:(miny+maxy)/2+0.05,cz:(minz+maxz)/2,dist:ext*1.62+0.4,lying:(maxy-miny)<1.5};}
  const c=def._cam;const t=(performance.now()-GL.t0)/1000;const front=def.view==='front';const rear=rearView(active);let az=(front?0.1:1.0)+Math.sin(t/4.5+(phase||0))*(front?0.38:0.22);if(rear)az=Math.PI-az;const el=c.lying?0.55:0.24;
  const target=new THREE.Vector3(0,c.cy,c.cz);GL.camera.position.set(target.x+c.dist*Math.sin(az)*Math.cos(el),target.y+c.dist*Math.sin(el),target.z+c.dist*Math.cos(az)*Math.cos(el));GL.camera.lookAt(target);
  GL.floor.position.z=c.cz;GL.renderer.render(GL.scene,GL.camera);return true;
};

// ===================== UTILITIES =====================
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad2=n=>String(n).padStart(2,'0');
const clone=o=>JSON.parse(JSON.stringify(o));
const num=(v,d=0)=>{const n=parseFloat(v);return Number.isFinite(n)?n:d;};
const round=(n,p=0)=>{const m=Math.pow(10,p);return Math.round(n*m)/m;};
function localISO(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
const todayISO=()=>localISO(new Date());
function parseISO(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);}
function addDays(iso,n){const d=parseISO(iso);d.setDate(d.getDate()+n);return localISO(d);}
function daysBetween(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000);}
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso,wd=true){const d=parseISO(iso);return (wd?WD[d.getDay()]+', ':'')+MO[d.getMonth()]+' '+d.getDate();}
function fmtDateLong(iso){const d=parseISO(iso);return WDL[d.getDay()]+', '+MO[d.getMonth()]+' '+d.getDate();}
function fmtClock(sec){sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?h+':'+pad2(m)+':'+pad2(s):m+':'+pad2(s);}
function fmtClockMs(ms){ms=Math.max(0,ms);const t=Math.floor(ms/100);const sec=Math.floor(t/10),d=t%10;return fmtClock(sec)+'.'+d;}
function fmtPace(secPerKm){if(!Number.isFinite(secPerKm)||secPerKm<=0)return '–';const m=Math.floor(secPerKm/60),s=Math.round(secPerKm%60);return m+':'+pad2(s);}
function fmtKmh(mps){return Number.isFinite(mps)&&mps>0?round(mps*3.6,1).toFixed(1):'–';}
function lsGet(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function videoSearch(key){const name=(EXERCISES[key]||{}).name||key.replace(/_/g,' ');return 'https://www.youtube.com/results?search_query='+encodeURIComponent(name+' technique');}
function videoLink(key){const v=VIDEOS&&VIDEOS[key];if(v&&v.pro&&v.pro.url)return v.pro.url;if(v&&v.demo&&v.demo.url)return v.demo.url;return videoSearch(key);}
function videoLabel(key){const v=VIDEOS&&VIDEOS[key];const x=v&&(v.pro||v.demo);return x&&x.channel?('Watch · '+x.channel):'Watch on YouTube';}
function videoCards(key,label){const v=(VIDEOS&&VIDEOS[key])||{};const out=[];const play='<span class="play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></span>';
  if(v.pro&&v.pro.url)out.push('<a class="vid" href="'+esc(v.pro.url)+'" target="_blank" rel="noopener">'+play+'<div><div class="vt">'+esc(v.pro.title||'Coaching video')+'</div><div class="vs">'+esc(v.pro.channel?'Coaching · '+v.pro.channel:'Coaching video')+' · opens YouTube</div></div></a>');
  if(v.demo&&v.demo.url&&(!v.pro||v.demo.url!==v.pro.url))out.push('<a class="vid" href="'+esc(v.demo.url)+'" target="_blank" rel="noopener">'+play+'<div><div class="vt">'+esc(v.demo.title||'Quick demo')+'</div><div class="vs">'+esc(v.demo.channel?'Demo · '+v.demo.channel:'Demo')+' · opens YouTube</div></div></a>');
  if(!out.length)out.push('<a class="vid" href="'+esc(videoSearch(key))+'" target="_blank" rel="noopener">'+play+'<div><div class="vt">Search technique videos</div><div class="vs">opens YouTube</div></div></a>');
  return (label?'<div class="k">'+esc(label)+'</div>':'')+'<div class="stack tight">'+out.join('')+'</div>';}
function laurelRing(week){const n=12,r=34,c=2*Math.PI*r,segLen=c/n,gap=3;let g='';for(let i=0;i<n;i++){const done=i<week-1,cur=i===week-1;g+='<circle cx="42" cy="42" r="'+r+'" fill="none" stroke="'+(done?'#D9A24A':cur?'#E4B467':'#2A3038')+'" stroke-width="'+(cur?8:6)+'" stroke-dasharray="'+(segLen-gap).toFixed(2)+' '+(c-segLen+gap).toFixed(2)+'" stroke-dashoffset="'+(-(i*segLen)).toFixed(2)+'" transform="rotate(-90 42 42)" stroke-linecap="round"/>';}
  return '<svg viewBox="0 0 84 84" role="img" aria-label="Week '+week+' of 12">'+g+'<text x="42" y="47" text-anchor="middle" style="font:800 22px var(--head);fill:var(--fg)">'+(week<1?'0':Math.min(week,12))+'</text></svg>';}
function targets(){return paceTargets(num(S.profile.fiveKSec,1530));}
function paceWin(a,b){return fmtPace(a)+'–'+fmtPace(b);}
function repTarget(dist){const t=targets().rep[dist];return t?[Math.round(t[0]),Math.round(t[1])]:null;}
function repJudge(dist,sec){const t=repTarget(dist);if(!t)return '';if(sec<t[0]-3)return 'warn';if(sec<=t[1]+3)return 'good';return 'bad';}
const ICON={play:'<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>',check:'<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',camera:'<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',chev:'<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',back:'<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',coach:'<svg viewBox="0 0 24 24"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>',video:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',swap:'<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',book:'<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h14M8 7h8"/></svg>',run:'<svg viewBox="0 0 24 24"><circle cx="15" cy="4" r="1.8"/><path d="M13 8l-4 3 2 4-3 5M13 8l3 3 4-1M11 15l4 2 1 4"/></svg>'};

// ===================== STATE & PERSISTENCE =====================
const COLS=['workouts','runs','body','food','meals','reviews'];
const S={profile:{...DEFAULT_PROFILE},workouts:{},runs:{},body:{},food:{},meals:{},reviews:{},overrides:{},ui:{tab:'today',sub:null}};
(function load(){
  const saved=lsGet('olympus.v1',null);
  if(saved){for(const c of COLS)S[c]=saved[c]||{};S.profile={...DEFAULT_PROFILE,...(saved.profile||{})};S.overrides=saved.overrides||{};}
  const ui=lsGet('olympus.ui',null);if(ui)S.ui={...S.ui,...ui};
})();
function persist(){const o={profile:S.profile,overrides:S.overrides};for(const c of COLS)o[c]=S[c];lsSet('olympus.v1',o);}
function save(col,id,doc){doc.id=id;doc.updatedAt=Date.now();S[col][id]=doc;persist();queueWrite(col,id,doc);return doc;}
function remove(col,id){delete S[col][id];persist();queueWrite(col,id,null);}
function saveProfile(patch){S.profile={...S.profile,...patch,updatedAt:Date.now()};persist();queueWrite('profile','profile',S.profile);}
function saveOverrides(){S.overrides.updatedAt=Date.now();persist();queueWrite('overrides','overrides',S.overrides);}
function sorted(col,desc=true){return Object.values(S[col]).sort((a,b)=>desc?(b.date||'').localeCompare(a.date||'')||(b.updatedAt||0)-(a.updatedAt||0):(a.date||'').localeCompare(b.date||'')||(a.updatedAt||0)-(b.updatedAt||0));}

// ----- Sync with the artifact's document store (works offline through localStorage; syncs when the store is reachable) -----
const Sync={db:null,pending:lsGet('olympus.pending',{}),busy:new Set(),timer:null,seen:{}};
function dbPath(col,id){if(col==='profile')return 'settings/profile';if(col==='overrides')return 'plan/overrides';return col+'/'+String(id).replace(/[^A-Za-z0-9_\-.~:@+]/g,'_');}
function queueWrite(col,id,doc){const p=dbPath(col,id);Sync.pending[p]=doc?{col,id,doc:clone(doc)}:{col,id,del:true};lsSet('olympus.pending',Sync.pending);flush();}
async function flush(){
  if(!Sync.db)return;clearTimeout(Sync.timer);let failed=false;
  for(const [path,item] of Object.entries(Sync.pending)){
    if(Sync.busy.has(path))continue;Sync.busy.add(path);
    try{const ref=Sync.db.doc(path);if(item.del)await ref.delete();else await ref.set(item.doc);if(Sync.pending[path]===item){delete Sync.pending[path];lsSet('olympus.pending',Sync.pending);}}
    catch(e){failed=true;if(e&&e.code==='invalid_argument'){delete Sync.pending[path];lsSet('olympus.pending',Sync.pending);}console.warn('sync',path,e&&e.code,e&&e.message);}
    finally{Sync.busy.delete(path);}
  }
  if(Object.keys(Sync.pending).length)Sync.timer=setTimeout(flush,failed?30000:3000);
  setSyncDot();
}
function setSyncDot(){const el=$('#syncdot');if(!el)return;const n=Object.keys(Sync.pending).length;el.title=Sync.db?(n?n+' changes waiting to sync':'Synced to your Claude account'):'Saved on this device only';el.style.background=Sync.db?(n?'var(--warn)':'var(--good)'):'var(--fg2)';}
function subscribeAll(){
  for(const col of COLS){
    Sync.db.collection(col).onSnapshot(snap=>{
      let changed=false;const present=new Set();
      for(const ch of snap.docChanges()){const d=ch.doc;present.add(d.id);
        if(ch.type==='removed'){if(S[col][d.id]&&!Sync.pending[dbPath(col,d.id)]){delete S[col][d.id];changed=true;}continue;}
        const data=d.data();if(!data)continue;const cur=S[col][d.id];
        if(!cur||(data.updatedAt||0)>(cur.updatedAt||0)){S[col][d.id]=clone(data);changed=true;}
      }
      if(!Sync.seen[col]){Sync.seen[col]=true;const ids=new Set(snap.docs.map(d=>d.id));for(const [id,doc] of Object.entries(S[col]))if(!ids.has(dbPath(col,id).split('/')[1])&&!Sync.pending[dbPath(col,id)])queueWrite(col,id,doc);}
      if(changed){persist();rerender();}
    },e=>console.warn('snapshot',col,e&&e.code));
  }
  Sync.db.doc('settings/profile').onSnapshot(snap=>{if(snap.exists){const d=snap.data();if((d.updatedAt||0)>(S.profile.updatedAt||0)){S.profile={...DEFAULT_PROFILE,...clone(d)};persist();rerender();}}else if(S.profile.updatedAt)queueWrite('profile','profile',S.profile);},e=>console.warn(e&&e.code));
  Sync.db.doc('plan/overrides').onSnapshot(snap=>{if(snap.exists){const d=snap.data();if((d.updatedAt||0)>(S.overrides.updatedAt||0)){S.overrides=clone(d);persist();rerender();}}else if(S.overrides.updatedAt)queueWrite('overrides','overrides',S.overrides);},e=>console.warn(e&&e.code));
}
const Caps={sample:null,limits:null,assets:null,ready:false};
(async function boot(){
  try{
    if(!(window.claude&&typeof window.claude.use==='function')){Caps.ready=true;setSyncDot();return;}
    const [db,sample,assets]=await Promise.all([claude.use('db'),claude.use('sample'),claude.use('assets')]);
    if(db){Sync.db=db;subscribeAll();flush();}
    Caps.sample=sample||null;Caps.assets=assets||null;
    if(sample){try{Caps.limits=await sample.limits();}catch(e){Caps.limits=null;}}
  }catch(e){console.warn('capabilities',e);}
  Caps.ready=true;setSyncDot();rerender();
})();
window.addEventListener('online',()=>flush());

// ===================== PROGRAM ENGINE =====================
function weekOf(iso){return Math.floor(daysBetween(S.profile.startDate,iso)/7)+1;}
function weekLabel(w){if(w<1)return 'Starts '+fmtDate(S.profile.startDate);if(w>12)return 'Week '+w+' · beyond the 12';return 'Week '+w+' of 12';}
function phaseOf(w){if(w<1)return 'Pre-start';if(w<=2)return 'Ramp';if(w<=6)return 'Build';if(w<=10)return 'Push';if(w===11)return 'Deload';if(w===12)return 'Test';return 'Maintain';}
function phaseNote(w){return{Ramp:'3 sets on the first two lifts, nothing to failure. Let the body re-learn 4 days.',Build:'Full sets. Add weight the week you hit the top of the rep range on every set.',Push:'One extra set on lateral raises and pull-ups. Push the main lifts.',Deload:'3 sets everywhere, 2 reps short of failure. Easy running week.',Test:'5RM squat, 6RM incline press, max pull-ups, 5 km time trial. Photos and measurements.',Maintain:'The 12 weeks are done. Reassess with the coach: maintenance block or a second cut.','Pre-start':'Use this week to learn the lifts and test the logger.'}[phaseOf(w)]||'';}
function dayForDate(iso){const wd=parseISO(iso).getDay();return PROGRAM.order.find(k=>PROGRAM.days[k].weekday===wd)||null;}
function runForDate(iso){const wd=parseISO(iso).getDay();return wd===2?'easy':wd===3?'track':wd===6?'long':wd===0?'walk':null;}
function runPlanFor(week){return RUN_PLAN.find(r=>r.weeks.includes(week))||(week>12?RUN_PLAN[4]:RUN_PLAN[0]);}
function runDesc(kind,week){const p=runPlanFor(week);if(kind==='easy')return 'Easy run '+p.easy.min+' min';if(kind==='track')return p.track.label;if(kind==='long')return 'Long easy run '+p.long.min+' min';if(kind==='walk')return 'Rest · walk 45–60 min';return '';}
function prescription(dayKey,week){
  const day=PROGRAM.days[dayKey];const ov=(S.overrides.days||{})[dayKey]||{};
  const ex=day.ex.map(e=>{
    let o={...e};const w=week;
    if(w<=2&&o.main){o.sets=Math.min(o.sets,3);o.phase='Ramp: 3 sets';}
    if(w>=7&&w<=10&&(o.key==='lateral_raise'||o.key==='weighted_pullup')){o.sets=o.sets+1;o.phase='+1 set this phase';}
    if(w===11){o.sets=Math.min(o.sets,3);o.phase='Deload';}
    if(w===12&&o.main){o.phase='Test: work up to a heavy top set';}
    if(o.key==='trap_bar_deadlift'&&w>=1&&w%2===0){o.key='hip_thrust';o.sets=4;o.reps='8';o.note='Heavy hip thrust week (alternates with the deadlift)';}
    const u=ov[e.key];if(u){if(u.sub&&EXERCISES[u.sub])o.key=u.sub;if(u.sets)o.sets=u.sets;if(u.reps)o.reps=u.reps;o.custom=true;}
    o.name=EXERCISES[o.key].name;o.unit=EXERCISES[o.key].unit;o.origKey=e.key;return o;
  });
  return {key:dayKey,label:day.label,focus:day.focus,ex};
}
function parseRepsLow(reps){const m=String(reps).match(/\d+/);return m?parseInt(m[0],10):8;}
function parseRepsHigh(reps){const m=String(reps).match(/(\d+)\s*[–-]\s*(\d+)/);return m?parseInt(m[2],10):parseRepsLow(reps);}

// ----- Workout helpers -----
function e1rm(w,r){if(!(w>0)||!(r>0))return 0;if(r===1)return w;return w*(1+r/30);}
function setScore(exKey,s){const u=(EXERCISES[exKey]||{}).unit;if(u==='time')return num(s.r);if(u==='bw')return num(s.w)>0?e1rm(num(s.w),num(s.r)):num(s.r);return e1rm(num(s.w),num(s.r));}
function finishedWorkouts(){return sorted('workouts').filter(w=>w.finishedAt);}
function lastSetsFor(exKey,excludeId){for(const w of finishedWorkouts()){if(w.id===excludeId)continue;const e=(w.exercises||[]).find(x=>x.key===exKey);if(e&&e.sets.some(s=>s.done))return {date:w.date,sets:e.sets.filter(s=>s.done)};}return null;}
function bestFor(exKey,excludeId){let best=null;for(const w of finishedWorkouts()){if(w.id===excludeId)continue;const e=(w.exercises||[]).find(x=>x.key===exKey);if(!e)continue;for(const s of e.sets){if(!s.done)continue;const sc=setScore(exKey,s);if(!best||sc>best.score)best={score:sc,w:num(s.w),r:num(s.r),date:w.date};}}return best;}
function fmtSet(exKey,s){const u=(EXERCISES[exKey]||{}).unit;if(u==='time')return num(s.r)+' s';if(u==='bw')return (num(s.w)>0?'+'+num(s.w)+' × ':'BW × ')+num(s.r);return num(s.w)+' × '+num(s.r);}
function workoutVolume(w){let v=0,sets=0;for(const e of w.exercises||[])for(const s of e.sets)if(s.done){sets++;v+=num(s.w)*num(s.r);}return{volume:v,sets};}

// ===================== SHELL =====================
const Views={};
function go(tab,sub){if(tab!==S.ui.tab)S.ui.prevTab=S.ui.tab;S.ui.tab=tab;S.ui.sub=sub===undefined?null:sub;lsSet('olympus.ui',S.ui);render();const v=$('#view');if(v)v.scrollTop=0;}
function setSub(sub){S.ui.prevSub=S.ui.sub||null;S.ui.sub=sub;lsSet('olympus.ui',S.ui);render();const v=$('#view');if(v)v.scrollTop=0;}
function render(){
  $$('#tabs button').forEach(b=>{if(b.dataset.tab===S.ui.tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const fn=Views[S.ui.tab]||Views.today;const view=$('#view');
  try{view.innerHTML=fn();}catch(e){console.error(e);view.innerHTML='<div class="card"><b>Something went wrong drawing this screen.</b><p class="note">'+esc(e.message)+'</p><button class="btn" id="btn-reset-view">Back to Today</button></div>';$('#btn-reset-view').onclick=()=>go('today');return;}
  if(fn.bind)fn.bind(view);
  try{Anim.mount();}catch(e){console.warn('anim',e);}
  const w=weekOf(todayISO());$('#tb-sub').textContent=weekLabel(w)+' · '+phaseOf(w);
  $('#tb-right').innerHTML='<span id="syncdot" style="width:8px;height:8px;border-radius:99px;background:var(--fg2);display:inline-block"></span><button class="iconbtn" id="btn-learn" title="Learn">'+ICON.book+'</button><button class="iconbtn" id="btn-coach" title="Coach">'+ICON.coach+'</button><button class="iconbtn" id="btn-settings" title="Settings">'+ICON.gear+'</button>';
  $('#btn-learn').onclick=()=>go('learn');$('#btn-coach').onclick=()=>go('coach');$('#btn-settings').onclick=()=>go('settings');setSyncDot();
}
let rerenderPending=false;
function rerender(){const a=document.activeElement;if(a&&a.closest&&a.closest('#view, #sheet')&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT')){rerenderPending=true;return;}if($('#sheet').hidden===false){rerenderPending=true;return;}render();}
document.addEventListener('focusout',()=>{if(rerenderPending){rerenderPending=false;setTimeout(()=>{if(!(document.activeElement&&document.activeElement.closest('#view, #sheet')&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)))render();},50);}});
$$('#tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
let toastT=null;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}
function sheet(html,bind){const s=$('#sheet'),p=$('#sheet-panel');p.innerHTML='<div class="handle"></div>'+html;s.hidden=false;if(bind)bind(p);s.onclick=e=>{if(e.target===s)closeSheet();};}
function closeSheet(){const s=$('#sheet');s.hidden=true;$('#sheet-panel').innerHTML='';if(rerenderPending){rerenderPending=false;render();}}
function confirmSheet(title,body,okLabel,onOk,danger){sheet('<div class="h2">'+esc(title)+'</div><p class="note">'+esc(body)+'</p><div class="grid2"><button class="btn" id="c-no">Cancel</button><button class="btn '+(danger?'danger':'primary')+'" id="c-ok">'+esc(okLabel)+'</button></div>',p=>{$('#c-no',p).onclick=closeSheet;$('#c-ok',p).onclick=()=>{closeSheet();onOk();};});}

// ===================== SOUND, VIBRATION, WAKE LOCK =====================
let audioCtx=null;
function beep(n=1,freq=880){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const t0=audioCtx.currentTime;for(let i=0;i<n;i++){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0.0001,t0+i*0.25);g.gain.exponentialRampToValueAtTime(0.4,t0+i*0.25+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t0+i*0.25+0.2);o.connect(g).connect(audioCtx.destination);o.start(t0+i*0.25);o.stop(t0+i*0.25+0.22);}}catch(e){}}
function buzz(p){try{if(navigator.vibrate)navigator.vibrate(p||[120]);}catch(e){}}
function primeAudio(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}catch(e){}}
let wakeLock=null;async function keepAwake(on){try{if(on&&!wakeLock&&navigator.wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}else if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch(e){wakeLock=null;}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(SW.running||Rest.endAt))keepAwake(true);});

// ===================== REST TIMER =====================
const Rest={endAt:0,total:0,label:'',t:null};
Rest.start=function(sec,label){primeAudio();Rest.total=sec;Rest.endAt=Date.now()+sec*1000;Rest.label=label||'Rest';Rest.fired=false;clearInterval(Rest.t);Rest.t=setInterval(Rest.tick,250);Rest.draw();keepAwake(true);};
Rest.stop=function(){clearInterval(Rest.t);Rest.endAt=0;$('#restbar').hidden=true;if(!SW.running)keepAwake(false);};
Rest.tick=function(){const left=Rest.endAt-Date.now();if(left<=0&&!Rest.fired){Rest.fired=true;beep(3,988);buzz([150,80,150,80,300]);}if(left<=-15000)return Rest.stop();Rest.draw();};
Rest.draw=function(){const bar=$('#restbar');bar.hidden=false;const left=Math.max(0,Rest.endAt-Date.now());const pct=Rest.total?Math.max(0,Math.min(100,100*left/(Rest.total*1000))):0;const done=left<=0;
  bar.innerHTML='<div class="inner"><div><div class="time">'+(done?'GO':fmtClock(Math.ceil(left/1000)))+'</div><div class="lab">'+esc(Rest.label)+'</div></div><div class="prog"><i style="width:'+pct+'%"></i></div><button class="btn sm" id="rest-add">+30</button><button class="btn sm" id="rest-skip">'+(done?'Done':'Skip')+'</button></div>';
  $('#rest-add').onclick=()=>{Rest.endAt=Math.max(Date.now(),Rest.endAt)+30000;Rest.total+=30;Rest.fired=false;Rest.draw();};$('#rest-skip').onclick=Rest.stop;};

// ===================== STOPWATCH (track mode) =====================
const SW={running:false,startAt:0,before:0,laps:[],t:null,onTick:null,mode:null,lapM:400};
SW.elapsed=()=>SW.before+(SW.running?Date.now()-SW.startAt:0);
SW.start=function(){primeAudio();if(SW.running)return;SW.running=true;SW.startAt=Date.now();clearInterval(SW.t);SW.t=setInterval(()=>SW.onTick&&SW.onTick(),100);keepAwake(true);};
SW.pause=function(){if(!SW.running)return;SW.before=SW.elapsed();SW.running=false;clearInterval(SW.t);SW.onTick&&SW.onTick();if(!Rest.endAt)keepAwake(false);};
SW.reset=function(){SW.pause();SW.before=0;SW.laps=[];SW.mode=null;SW.onTick&&SW.onTick();};
SW.lap=function(dist){const now=SW.elapsed();const prev=SW.laps.length?SW.laps[SW.laps.length-1].at:0;const l={n:SW.laps.length+1,at:now,ms:now-prev,m:dist||SW.lapM};SW.laps.push(l);buzz([60]);return l;};
SW.lapSince=()=>SW.elapsed()-(SW.laps.length?SW.laps[SW.laps.length-1].at:0);

// ===================== CHARTS (inline SVG) =====================
function lineChart(o){
  const W=o.w||340,H=o.h||150,pl=38,pr=10,pt=10,pb=22;const series=o.series.filter(s=>s.pts.length);
  if(!series.length)return '<div class="empty"><b>'+esc(o.emptyTitle||'No data yet')+'</b>'+esc(o.emptyNote||'')+'</div>';
  const xs=[].concat(...series.map(s=>s.pts.map(p=>p.x)));const ys=[].concat(...series.map(s=>s.pts.map(p=>p.y)));if(o.target!=null)ys.push(o.target);
  let x0=Math.min(...xs),x1=Math.max(...xs);if(x1===x0){x0-=1;x1+=1;}let y0=Math.min(...ys),y1=Math.max(...ys);const padY=(y1-y0)*0.15||1;y0=o.yMin!=null?o.yMin:y0-padY;y1=y1+padY;
  const X=x=>pl+(x-x0)/(x1-x0)*(W-pl-pr),Y=y=>pt+(1-(y-y0)/(y1-y0))*(H-pt-pb);
  let g='';const ticks=4;for(let i=0;i<=ticks;i++){const v=y0+(y1-y0)*i/ticks;g+='<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+(o.yFmt?o.yFmt(v):round(v,1))+'</text>';}
  const xl=o.xLabels||[];for(const t of xl)g+='<text x="'+X(t.x)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(t.label)+'</text>';
  if(o.target!=null)g+='<line class="target" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(o.target)+'" y2="'+Y(o.target)+'"/><text x="'+(W-pr)+'" y="'+(Y(o.target)-4)+'" text-anchor="end" fill="var(--good)">'+esc(o.targetLabel||'target')+'</text>';
  for(const s of series){const pts=s.pts.slice().sort((a,b)=>a.x-b.x);
    if(s.dots)g+=pts.map(p=>'<circle class="dot '+(s.cls||'')+'" cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="'+(s.r||2.5)+'"/>').join('');
    else{const d=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join(' ');if(s.area)g+='<path class="area" d="'+d+' L'+X(pts[pts.length-1].x).toFixed(1)+' '+(H-pb)+' L'+X(pts[0].x).toFixed(1)+' '+(H-pb)+' Z"/>';g+='<path class="line '+(s.cls||'')+'" d="'+d+'"/>';const last=pts[pts.length-1];g+='<circle class="dot" cx="'+X(last.x)+'" cy="'+Y(last.y)+'" r="3.5" style="fill:'+(s.cls==='bronze'?'var(--bronze)':'var(--accent)')+'"/>';}
  }
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||'chart')+'">'+g+'</svg>';
}
function barChart(o){
  const W=o.w||340,H=o.h||140,pl=38,pr=10,pt=10,pb=22;const vals=o.bars;if(!vals.length)return '<div class="empty"><b>No data yet</b></div>';
  const max=Math.max(o.target||0,...vals.map(b=>b.v))*1.1||1;const bw=(W-pl-pr)/vals.length;const Y=v=>pt+(1-v/max)*(H-pt-pb);let g='';
  for(let i=0;i<=3;i++){const v=max*i/3;g+='<line class="grid" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>';}
  vals.forEach((b,i)=>{const x=pl+i*bw+bw*0.15,w=bw*0.7;g+='<rect class="bar '+(o.target&&b.v>o.target*1.08?'over':'')+'" x="'+x+'" y="'+Y(b.v)+'" width="'+w+'" height="'+(H-pb-Y(b.v))+'" rx="3"/><text x="'+(x+w/2)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(b.label)+'</text>';});
  if(o.target)g+='<line class="target" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(o.target)+'" y2="'+Y(o.target)+'"/>';
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||'chart')+'">'+g+'</svg>';
}
function ring(v,max,label,color,unit){const r=30,c=2*Math.PI*r,p=Math.max(0,Math.min(1,max?v/max:0)),over=max&&v>max*1.05;return '<div class="ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="'+r+'" fill="none" stroke="var(--line2)" stroke-width="7"/><circle cx="36" cy="36" r="'+r+'" fill="none" stroke="'+(over?'var(--warn)':color)+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+(c*p).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 36 36)"/><text x="36" y="40" text-anchor="middle" style="font:700 15px var(--numeric);fill:var(--fg)">'+Math.round(v)+'</text></svg><div class="v muted" style="font-size:12px">/ '+Math.round(max)+(unit||'')+'</div><div class="l">'+esc(label)+'</div></div>';}

// ===================== BODY & FOOD HELPERS =====================
function weightSeries(){return sorted('body',false).filter(b=>b.weightLb>0).map(b=>({date:b.date,v:b.weightLb}));}
function movingAvg(series,n=7){return series.map((p,i)=>{const sl=series.slice(Math.max(0,i-n+1),i+1);return {date:p.date,v:sl.reduce((a,b)=>a+b.v,0)/sl.length};});}
function weekAvg(series,endISO){const start=addDays(endISO,-6);const sl=series.filter(p=>p.date>=start&&p.date<=endISO);return sl.length?sl.reduce((a,b)=>a+b.v,0)/sl.length:null;}
function foodDay(iso){return S.food[iso]||{id:iso,date:iso,entries:[],water:0};}
function dayTotals(iso){const d=foodDay(iso);return d.entries.reduce((a,e)=>({kcal:a.kcal+num(e.kcal),p:a.p+num(e.p),c:a.c+num(e.c),f:a.f+num(e.f)}),{kcal:0,p:0,c:0,f:0});}
function kcalTarget(){return num(S.overrides.kcal,0)||S.profile.kcal;}
function thumbFrom(file,size=120){return new Promise(res=>{try{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas');const s=Math.min(img.width,img.height);c.width=size;c.height=size;c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.6));};img.onerror=()=>res(null);img.src=u;}catch(e){res(null);}});}
function sampleErrorText(e){const c=e&&e.code;return c==='not_granted'?'Claude access was declined for this app. Allow it from the artifact\'s Permissions menu to use AI features.':c==='rate_limited'?'Too many requests right now. Try again in a minute.':c==='image_rejected'?'That photo could not be read. Try a JPEG or PNG under 20 MB.':c==='invalid_json'?'The estimate came back malformed. Try again or describe the meal in words.':c==='refused'?'Claude declined that request.':c==='cancelled'?'':'Claude is unreachable right now. Try again shortly.';}

// ===================== VIEW: TODAY =====================
function dayDone(iso){const w=Object.values(S.workouts).some(x=>x.date===iso&&x.finishedAt);const r=Object.values(S.runs).some(x=>x.date===iso);return {w,r};}
function activeWorkout(){return Object.values(S.workouts).find(w=>!w.finishedAt)||null;}
const chev=()=>ICON.chev.replace('<svg','<svg style="width:16px;height:16px;stroke:var(--fg3);fill:none;stroke-width:2;flex:none"');
Views.today=function(){
  const t=todayISO(),w=weekOf(t),dayKey=dayForDate(t),runKind=runForDate(t),tot=dayTotals(t),body=S.body[t]||{};
  const ws=weightSeries(),avg=weekAvg(ws,t),prevAvg=weekAvg(ws,addDays(t,-7));
  const act=activeWorkout();const done=dayDone(t);
  const tip=TIPS[daysBetween('2026-01-01',t)%TIPS.length];
  const weeksLeft=Math.max(0,12-Math.max(0,w-1));
  let plan='';
  if(dayKey){const p=prescription(dayKey,w);const d=PROGRAM.days[dayKey];plan+='<div class="card"><div class="row between"><div class="grow" style="min-width:0"><div class="eyebrow b">Lifting · ~55 min</div><div class="h2" style="margin-top:4px">'+esc(p.label)+'</div><div class="small muted" style="margin-top:2px">'+esc(p.focus)+'</div></div></div><p class="note" style="margin-top:8px">'+esc(d.brief)+'</p><div class="row" style="margin-top:12px">'+(done.w?'<span class="pill good">'+ICON.check+' Done today</span>':act&&act.dayKey===dayKey?'<button class="btn primary block" id="t-resume">'+ICON.play+' Continue '+esc(p.label)+'</button>':'<button class="btn primary block" id="t-start">'+ICON.play+' Start '+esc(p.label)+'</button>')+'</div></div>';}
  if(runKind){const b=RUN_BRIEFS[runKind];plan+='<div class="card"><div class="eyebrow b">Running</div><div class="h2" style="margin-top:4px">'+esc(runDesc(runKind,w))+'</div><p class="note" style="margin-top:8px">'+esc(b.feel)+'</p><div class="row" style="margin-top:12px">'+(done.r?'<span class="pill good">'+ICON.check+' Logged today</span>':runKind==='walk'?'':'<button class="btn block" id="t-run">'+ICON.run+' Open run tracker</button>')+'</div></div>';}
  if(!dayKey&&!runKind)plan+='<div class="card"><div class="eyebrow b">Wednesday</div><div class="h2">Track day</div></div>';
  const weekStart=addDays(t,-((parseISO(t).getDay()+6)%7));
  let strip='';for(let i=0;i<7;i++){const d=addDays(weekStart,i);const dk=dayForDate(d),rk=runForDate(d);const dd=dayDone(d);const isRest=!dk&&!rk;const ok=(dk?dd.w:true)&&(rk&&rk!=='walk'?dd.r:true)&&(dk||(rk&&rk!=='walk'));strip+='<div class="d '+(d===t?'today ':'')+(ok?'done ':'')+(isRest||rk==='walk'?'rest':'')+'"><b>'+WD[parseISO(d).getDay()][0]+'</b>'+(dk?PROGRAM.days[dk].label.replace('Upper','Up').replace('Lower','Low'):rk==='track'?'Track':rk==='long'?'Long':rk==='walk'?'Rest':'—')+'</div>';}
  const installed=lsGet('olympus.installHint',false);
  return '<div class="hero"><div class="row between" style="align-items:flex-start"><div><div class="eyebrow disp">'+fmtDateLong(t)+'</div><div class="h1" style="margin-top:8px">'+esc(weekLabel(w))+'</div><div class="row" style="margin-top:8px"><span class="pill bronze">'+esc(phaseOf(w))+'</span><span class="small muted">'+weeksLeft+' weeks to the test</span></div></div><div class="laurel">'+laurelRing(w)+'</div></div><p class="note" style="margin-top:12px;color:var(--fg)">'+esc(phaseNote(w))+'</p><div class="meander"></div></div>'
  +'<div class="card bronze"><div class="eyebrow disp">The goal</div><p style="margin-top:6px;font:700 17px/1.35 var(--body)">'+esc(S.profile.goal)+'</p></div>'
  +plan
  +'<div class="card flat"><div class="weekrow">'+strip+'</div></div>'
  +'<div class="grid2">'
  +'<div class="tile clickable" id="t-body"><div class="v">'+(avg?avg.toFixed(1):(body.weightLb||'–'))+' <span class="u">lb</span></div><div class="l">7-day avg weight</div><div class="d">'+(avg&&prevAvg?(avg-prevAvg>=0?'+':'')+(avg-prevAvg).toFixed(1)+' lb vs last week':'target '+S.profile.targetWeightLb+' lb')+'</div></div>'
  +'<div class="tile clickable" id="t-food"><div class="v">'+Math.round(tot.kcal)+' <span class="u">/ '+kcalTarget()+'</span></div><div class="l">Calories today</div><div class="d">'+Math.round(tot.p)+' g protein of '+S.profile.protein+'</div></div>'
  +'<div class="tile clickable" id="t-steps"><div class="v">'+(body.steps?body.steps.toLocaleString():'–')+'</div><div class="l">Steps</div><div class="d">goal '+S.profile.stepsGoal.toLocaleString()+' · tap to log</div></div>'
  +'<div class="tile clickable" id="t-water"><div class="v">'+(foodDay(t).water||0)+' <span class="u">/ '+S.profile.waterL+' L</span></div><div class="l">Water</div><div class="d">tap to add 0.5 L</div></div>'
  +'</div>'
  +'<div class="callout"><b>Coach:</b> '+esc(tip)+'</div>'
  +'<button class="btn block" id="t-learn">'+ICON.book+' How the program works</button>'
  +(installed?'':window.OLYMPUS_STANDALONE?'<div class="card"><div class="h3">Standalone version</div><p class="note" style="margin-top:4px">Everything you log is saved on this phone (use Export in Settings for a backup). Open the hosted address in Safari, tap Share, then <b>Add to Home Screen</b> for the full-screen app. AI food estimates, the coach review, photo storage and sync run only in the Claude-hosted version.</p><div class="row" style="margin-top:8px"><button class="btn sm" id="t-dismiss">Got it</button></div></div>':'<div class="card"><div class="h3">Put Olympus on your home screen</div><p class="note" style="margin-top:4px">Open this link in Safari on your iPhone, tap Share, then <b>Add to Home Screen</b>. It opens full-screen like an app and keeps you signed in. Your data syncs to your Claude account and also stays on the phone.</p><div class="row" style="margin-top:8px"><button class="btn sm" id="t-dismiss">Got it</button></div></div>');
};
Views.today.bind=function(v){
  const t=todayISO(),dk=dayForDate(t);
  const s=$('#t-start',v);if(s)s.onclick=()=>startSessionSheet(dk);
  const r=$('#t-resume',v);if(r)r.onclick=()=>{const a=activeWorkout();go('train','session:'+a.id);};
  const ru=$('#t-run',v);if(ru)ru.onclick=()=>go('run');
  $('#t-body',v).onclick=()=>go('body');$('#t-food',v).onclick=()=>go('food');$('#t-learn',v).onclick=()=>go('learn');
  $('#t-steps',v).onclick=()=>bodyQuickSheet('steps');
  $('#t-water',v).onclick=()=>{const d=foodDay(t);d.water=round(num(d.water)+0.5,1);save('food',t,d);toast('Water: '+d.water+' L');render();};
  const dis=$('#t-dismiss',v);if(dis)dis.onclick=()=>{lsSet('olympus.installHint',true);render();};
};

// ===================== VIEW: LEARN =====================
Views.learn=function(){
  return '<div class="row between">'+backBtn('Back')+'</div><div><div class="eyebrow disp">Learn</div><div class="h1" style="margin-top:6px">How the program works</div><p class="note" style="margin-top:8px">Seven short lessons. Read one before each of your first sessions and the plan will make sense in your body, not just on paper.</p></div>'
  +'<div class="card"><div class="demo-row"><div>'+demoCard('running',{caption:false})+'</div><div><div class="k">Running form</div><div class="stack tight"><div class="cue">Tall posture, slight lean from the ankles, eyes 20 m ahead.</div><div class="cue">Quick, light steps under the hips, about 170–180 per minute.</div><div class="cue">Arms swing front to back, hands relaxed, shoulders down.</div></div></div></div><div style="margin-top:10px">'+videoCards('running_form')+'</div></div>'
  +'<div class="card">'+LESSONS.map(l=>'<div class="lesson"><div class="lt">'+esc(l.title)+'</div><div class="ls">'+esc(l.sub)+'</div>'+l.body.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>').join('')+'</div>'
  +'<p class="note">Exercise illustrations by <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a>, CC BY-SA 4.0, recoloured for this app. Muscle map rendered with three.js.</p>';
};
Views.learn.bind=function(v){$('[data-back]',v).onclick=()=>go(S.ui.prevTab||'today');};

// ===================== VIEW: TRAIN =====================
let saveT=null;function saveWorkoutSoon(w){S.workouts[w.id]=w;persist();clearTimeout(saveT);saveT=setTimeout(()=>save('workouts',w.id,w),1200);}
function startSession(dayKey,opts){
  const t=todayISO(),w=weekOf(t);const existing=Object.values(S.workouts).find(x=>!x.finishedAt&&x.dayKey===dayKey&&x.date===t);
  if(existing)return go('train','session:'+existing.id);
  const p=prescription(dayKey,w);const light=opts&&opts.light;
  const ex=p.ex.map(e=>{const last=lastSetsFor(e.key);let n=e.sets;if(light&&!e.main)n=Math.max(2,n-1);const sets=[];for(let i=0;i<n;i++){const ls=last?(last.sets[i]||last.sets[last.sets.length-1]):null;sets.push({w:ls?ls.w:'',r:ls?ls.r:'',done:false});}return {key:e.key,origKey:e.origKey,name:e.name,unit:e.unit,reps:e.reps,rest:e.rest,note:e.note||'',phase:e.phase||'',main:!!e.main,sets};});
  const wo={id:uid(),date:t,week:w,dayKey,label:p.label,startedAt:Date.now(),finishedAt:null,light:!!light,exercises:ex,prs:[],notes:'',warm:[]};
  save('workouts',wo.id,wo);go('train','session:'+wo.id);
}
Views.train=function(){
  const sub=S.ui.sub||'';
  if(sub.startsWith('session:'))return sessionView(sub.slice(8));
  if(sub==='history')return historyView();
  if(sub.startsWith('workout:'))return workoutDetail(sub.slice(8));
  if(sub.startsWith('exercise:'))return exerciseDetail(sub.slice(9));
  if(sub==='library')return libraryView();
  return programView();
};
Views.train.bind=function(v){
  const sub=S.ui.sub||'';
  if(sub.startsWith('session:'))return bindSession(v,sub.slice(8));
  if(sub.startsWith('workout:'))return bindWorkoutDetail(v,sub.slice(8));
  if(sub.startsWith('exercise:'))return bindExercise(v,sub.slice(9));
  if(sub==='library')return bindLibrary(v);
  if(sub==='history')return bindHistory(v);
  return bindProgram(v);
};
function backBtn(label){return '<button class="btn ghost sm" data-back style="padding-left:0">'+ICON.back+' '+esc(label||'Back')+'</button>';}
function programView(){
  const t=todayISO(),w=weekOf(t);const act=activeWorkout();
  let cards='';for(const k of PROGRAM.order){const p=prescription(k,w);const d=PROGRAM.days[k];const lastW=finishedWorkouts().find(x=>x.dayKey===k);const isToday=dayForDate(t)===k;
    cards+='<div class="card'+(isToday?' accent':'')+'"><div class="row between"><div class="grow" style="min-width:0"><div class="eyebrow'+(isToday?' b':'')+'">'+WDL[d.weekday]+(isToday?' · today':'')+'</div><div class="h2" style="margin-top:3px">'+esc(p.label)+'</div><div class="small muted">'+esc(p.focus)+' · '+p.ex.length+' exercises'+(lastW?' · last '+fmtDate(lastW.date):'')+'</div></div>'+(act&&act.dayKey===k?'<button class="btn primary sm" data-resume="'+act.id+'">Continue</button>':'<button class="btn sm'+(isToday?' primary':'')+'" data-start="'+k+'">Start</button>')+'</div>'
    +'<p class="note" style="margin-top:8px">'+esc(d.brief)+'</p>'
    +'<div class="list" style="margin-top:6px">'+p.ex.map(e=>'<div class="item clickable" data-ex="'+e.key+'" style="padding:9px 0"><div class="grow"><div class="t" style="font-weight:600">'+esc(e.name)+(e.custom?' <span class="pill" style="font-size:10px">edited</span>':'')+'</div><div class="s">'+esc((EXERCISES[e.key]||{}).muscles||'')+'</div></div><div class="num muted">'+e.sets+' × '+esc(e.reps)+'</div>'+chev()+'</div>').join('')+'</div></div>';}
  return '<div class="row between"><div><div class="eyebrow disp">Program</div><div class="h1" style="margin-top:6px">'+esc(weekLabel(w))+'</div></div><div class="row"><button class="btn sm" id="p-history">History</button><button class="btn sm" id="p-library">Library</button></div></div>'
  +'<div class="callout"><b>'+esc(phaseOf(w))+':</b> '+esc(phaseNote(w))+'</div>'
  +cards
  +'<div class="card"><div class="eyebrow b">Warm-up, every session · 8 min</div><div class="steps" style="margin-top:6px">'+PROGRAM.warmup.map((x,i)=>'<div class="st"><b>'+(i+1)+'</b><div>'+esc(x.t)+'<small>'+esc(x.d)+'</small></div></div>').join('')+'</div></div>'
  +'<div class="card flat"><div class="eyebrow">Progression rule</div><p class="note" style="margin-top:4px">Double progression: when you hit the top of the rep range on every set, add 5 lb (upper) or 10 lb (lower) next time and start again at the bottom of the range. Stop every set 1–2 reps short of failure unless marked.</p><button class="btn ghost sm" id="p-learn" style="margin-top:6px">'+ICON.book+' All the lessons</button></div>';
}
function bindProgram(v){
  $('#p-history',v).onclick=()=>setSub('history');$('#p-library',v).onclick=()=>setSub('library');$('#p-learn',v).onclick=()=>go('learn');
  $$('[data-start]',v).forEach(b=>b.onclick=e=>{e.stopPropagation();startSessionSheet(b.dataset.start);});
  $$('[data-resume]',v).forEach(b=>b.onclick=e=>{e.stopPropagation();setSub('session:'+b.dataset.resume);});
  $$('[data-ex]',v).forEach(b=>b.onclick=()=>setSub('exercise:'+b.dataset.ex));
}
function startSessionSheet(dayKey){
  const w=weekOf(todayISO());const p=prescription(dayKey,w);const d=PROGRAM.days[dayKey];
  sheet('<div class="h2">Start '+esc(p.label)+'</div><p class="note">'+esc(d.brief)+'</p><p class="note"><b>Before you start:</b> the 8-minute warm-up, then ramp sets of the first lift. Weights and reps from your last session are pre-filled; tap the check when a set is done and the rest timer starts.</p><label class="row" style="gap:10px;padding:6px 0"><input type="checkbox" class="chk" id="ss-light"><span>Not feeling 100% today — one set less on the accessories</span></label><div class="grid2"><button class="btn" id="ss-no">Cancel</button><button class="btn primary" id="ss-ok">'+ICON.play+' Start</button></div>',pn=>{$('#ss-no',pn).onclick=closeSheet;$('#ss-ok',pn).onclick=()=>{const light=$('#ss-light',pn).checked;closeSheet();startSession(dayKey,{light});};});
}
function coachBlock(key,open){const ex=EXERCISES[key];if(!ex)return '';return '<details class="coach"'+(open?' open':'')+'><summary>Coach: how to do it <span class="pill bronze" style="font-size:10px">'+esc(ex.tempo)+'</span></summary><div class="body">'
  +'<div><div class="k">Technique</div><div class="stack tight">'+ex.cues.map(c=>'<div class="cue">'+esc(c)+'</div>').join('')+'</div></div>'
  +'<div><div class="k">Watch out for</div><div class="stack tight">'+ex.mistakes.map(c=>'<div class="cue bad">'+esc(c)+'</div>').join('')+'</div></div>'
  +(SAFETY[key]?'<div><div class="k">Joint safety · physio notes</div><div class="stack tight">'+SAFETY[key].map(c=>'<div class="cue good">'+esc(c)+'</div>').join('')+'</div></div>':'')
  +(ILLUS_NOTES[key]?'<p class="note">Illustration: '+esc(ILLUS_NOTES[key])+'</p>':'')
  +'<div class="grid2"><div><div class="k">Tempo</div><div class="small">'+esc(ex.tempo)+'</div></div><div><div class="k">Breathing</div><div class="small">'+esc(ex.breathe)+'</div></div></div>'
  +'<div><div class="k">Choosing the weight</div><div class="small">'+esc(ex.load)+'</div></div>'
  +videoCards(key,'Deeper dive')+'</div></details>';}
function sessionView(id){
  const wo=S.workouts[id];if(!wo)return '<div class="card"><b>Session not found.</b></div>';
  const d=PROGRAM.days[wo.dayKey]||{};const warm=wo.warm||[];
  let html='<div class="row between">'+backBtn('Program')+(wo.finishedAt?'':'<span class="pill bronze">In progress · '+fmtClock((Date.now()-wo.startedAt)/1000)+'</span>')+'</div>'
  +'<div><div class="eyebrow disp">'+fmtDate(wo.date)+' · week '+wo.week+(wo.light?' · lighter day':'')+'</div><div class="h1" style="margin-top:6px">'+esc(wo.label)+'</div><div class="small muted" style="margin-top:2px">'+esc(d.focus||'')+'</div></div>';
  if(!wo.finishedAt)html+='<details class="coach"'+(warm.length<PROGRAM.warmup.length?' open':'')+'><summary>Session brief and warm-up <span class="pill'+(warm.length>=PROGRAM.warmup.length?' good':'')+'" style="font-size:10px">'+warm.length+'/'+PROGRAM.warmup.length+'</span></summary><div class="body"><div class="why">'+esc(d.brief||'')+'</div><div><div class="k">How it should feel</div><div class="small">'+esc(d.feel||'')+'</div></div><div><div class="k">Warm-up · tick as you go</div><div class="stack tight">'+PROGRAM.warmup.map((x,i)=>'<label class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" class="chk" data-warm="'+i+'"'+(warm.includes(i)?' checked':'')+' style="margin-top:2px"><span class="small"><b>'+esc(x.t)+'</b><br><span class="muted">'+esc(x.d)+'</span></span></label>').join('')+'</div></div></div></details>';
  html+='<div class="card">';
  wo.exercises.forEach((e,ei)=>{
    const ex=EXERCISES[e.key]||{};const last=lastSetsFor(e.key,wo.id);const best=bestFor(e.key,wo.id);const unit=e.unit||ex.unit;
    const wLabel=unit==='bw'?'+'+S.profile.liftUnit:unit==='time'?'':S.profile.liftUnit;const rLabel=unit==='time'?'seconds':'reps';
    html+='<div class="ex" data-ei="'+ei+'"><div class="demo-row"><div>'+demoCard(e.key,{caption:false})+'</div><div class="grow" style="min-width:0"><div class="eyebrow b">'+(ei+1)+' of '+wo.exercises.length+'</div><div class="name" style="margin-top:4px">'+esc(e.name)+'</div><div class="rx">'+esc(ex.muscles||'')+'</div><div class="rx" style="color:var(--fg)">'+e.sets.length+' × '+esc(e.reps)+' · rest '+fmtClock(e.rest)+'</div>'+(e.phase||e.note?'<div style="margin-top:5px">'+(e.phase?'<span class="pill bronze" style="font-size:10px">'+esc(e.phase)+'</span> ':'')+(e.note?'<span class="pill" style="font-size:10px">'+esc(e.note)+'</span>':'')+'</div>':'')+'</div></div>'
    +'<div class="small" style="margin-top:10px;line-height:1.45">'+esc(ex.why||'')+'</div>'
    +'<div class="last">'+(last?'Last ('+fmtDate(last.date,false)+'): '+last.sets.map(s=>fmtSet(e.key,s)).join(', '):'First time: '+esc(ex.load||'find a weight that leaves 1–2 reps in the tank'))+(best?' · Best '+fmtSet(e.key,best):'')+'</div>';
    html+='<div class="sets"><div class="sethead"><span>Set</span><span>'+esc(wLabel||'—')+'</span><span>'+rLabel+'</span><span></span></div>';
    e.sets.forEach((s,si)=>{html+='<div class="setrow'+(s.done?' done':'')+(s.pr?' pr':'')+'" data-si="'+si+'"><div class="n">'+(s.pr?'PR':si+1)+'</div>'+(unit==='time'?'<div></div>':'<input class="input num" type="number" inputmode="decimal" step="any" data-f="w" value="'+esc(s.w)+'" placeholder="'+(unit==='bw'?'0':'–')+'" aria-label="weight">')+'<input class="input num" type="number" inputmode="numeric" data-f="r" value="'+esc(s.r)+'" placeholder="'+esc(e.reps)+'" aria-label="'+rLabel+'"><button class="ok" data-done aria-label="Set done">'+ICON.check+'</button></div>';});
    html+='</div><div class="tools"><button class="btn sm" data-addset>'+ICON.plus+' Set</button><button class="btn sm" data-swap>'+ICON.swap+' Swap</button><button class="btn sm" data-rest>Rest '+fmtClock(e.rest)+'</button></div><div style="margin-top:10px">'+coachBlock(e.key,false)+'</div></div>';
  });
  html+='</div>';
  html+='<div class="card"><div class="field"><label for="wo-notes">Session notes</label><textarea class="input" id="wo-notes" placeholder="Energy, soreness, anything the coach should know">'+esc(wo.notes||'')+'</textarea></div></div>';
  html+=wo.finishedAt?'<button class="btn block" id="wo-detail">View summary</button>':'<div class="grid2"><button class="btn danger" id="wo-discard">Discard</button><button class="btn primary" id="wo-finish">'+ICON.check+' Finish workout</button></div>';
  return html;
}
function bindSession(v,id){
  const wo=S.workouts[id];if(!wo)return;
  $('[data-back]',v).onclick=()=>setSub(null);
  $('#wo-notes',v).oninput=e=>{wo.notes=e.target.value;saveWorkoutSoon(wo);};
  $$('[data-warm]',v).forEach(c=>c.onchange=()=>{const i=+c.dataset.warm;wo.warm=wo.warm||[];if(c.checked){if(!wo.warm.includes(i))wo.warm.push(i);}else wo.warm=wo.warm.filter(x=>x!==i);saveWorkoutSoon(wo);const pill=$('.coach summary .pill',v);if(pill){pill.textContent=wo.warm.length+'/'+PROGRAM.warmup.length;pill.classList.toggle('good',wo.warm.length>=PROGRAM.warmup.length);}});
  $$('.ex',v).forEach(exEl=>{
    const ei=+exEl.dataset.ei,e=wo.exercises[ei];
    $$('.setrow',exEl).forEach(row=>{const si=+row.dataset.si,s=e.sets[si];
      $$('input',row).forEach(inp=>inp.oninput=()=>{s[inp.dataset.f]=inp.value;saveWorkoutSoon(wo);});
      $('[data-done]',row).onclick=()=>{
        if(!s.done){const wIn=$('[data-f="w"]',row),rIn=$('[data-f="r"]',row);if(wIn&&wIn.value==='')s.w=wIn.value=(e.unit==='bw'?'0':'');if(rIn.value===''){rIn.value=parseRepsLow(e.reps);s.r=rIn.value;}
          s.done=true;s.doneAt=Date.now();const best=bestFor(e.key,wo.id);const sc=setScore(e.key,s);
          const prevPR=e.sets.filter(x=>x.pr).map(x=>setScore(e.key,x));const sessionBest=prevPR.length?Math.max(...prevPR):0;
          if(sc>0&&(!best||sc>best.score+0.01)&&sc>sessionBest){s.pr=true;e.sets.forEach(x=>{if(x!==s)x.pr=false;});wo.prs=wo.prs.filter(p=>p.key!==e.key);wo.prs.push({key:e.key,name:e.name,w:num(s.w),r:num(s.r),score:round(sc,1)});toast('PR · '+e.name+' '+fmtSet(e.key,s));beep(2,1175);row.classList.add('pr');$('.n',row).textContent='PR';}
          row.classList.add('done');const lastSet=si===e.sets.length-1,lastEx=ei===wo.exercises.length-1;if(!(lastSet&&lastEx))Rest.start(e.rest,'Rest · '+(lastSet?'next: '+(wo.exercises[ei+1]||{}).name:e.name+' set '+(si+2)));
        }else{s.done=false;if(s.pr){s.pr=false;wo.prs=wo.prs.filter(p=>p.key!==e.key);row.classList.remove('pr');$('.n',row).textContent=si+1;}row.classList.remove('done');}
        saveWorkoutSoon(wo);
      };
    });
    $('[data-addset]',exEl).onclick=()=>{const l=e.sets[e.sets.length-1];e.sets.push({w:l?l.w:'',r:l?l.r:'',done:false});saveWorkoutSoon(wo);render();};
    $('[data-rest]',exEl).onclick=()=>Rest.start(e.rest,'Rest · '+e.name);
    $('[data-swap]',exEl).onclick=()=>swapSheet(wo,ei);
  });
  const fin=$('#wo-finish',v);if(fin)fin.onclick=()=>finishSheet(wo);
  const dis=$('#wo-discard',v);if(dis)dis.onclick=()=>confirmSheet('Discard this session?','Nothing from it will be kept.','Discard',()=>{remove('workouts',wo.id);Rest.stop();setSub(null);},true);
  const det=$('#wo-detail',v);if(det)det.onclick=()=>setSub('workout:'+wo.id);
}
function swapSheet(wo,ei){
  const e=wo.exercises[ei];const opts=Object.keys(EXERCISES).filter(k=>k!==e.key).sort((a,b)=>EXERCISES[a].name.localeCompare(EXERCISES[b].name));const sug=(PROGRAM.subs[e.origKey||e.key]||[]).filter(k=>k!==e.key);
  sheet('<div class="h2">Swap '+esc(e.name)+'</div>'+(sug.length?'<div class="eyebrow">Suggested</div><div class="chips">'+sug.map(k=>'<button data-k="'+k+'">'+esc(EXERCISES[k].name)+'</button>').join('')+'</div>':'')+'<div class="field"><label>Any exercise</label><select class="input" id="sw-sel"><option value="">Choose…</option>'+opts.map(k=>'<option value="'+k+'">'+esc(EXERCISES[k].name)+'</option>').join('')+'</select></div><label class="row" style="gap:10px"><input type="checkbox" class="chk" id="sw-keep"><span>Keep this swap for future sessions</span></label><div class="grid2"><button class="btn" id="sw-no">Cancel</button><button class="btn danger" id="sw-del">Remove from today</button></div>',p=>{
    const apply=k=>{const keep=$('#sw-keep',p).checked;const old=e.origKey||e.key;e.key=k;e.name=EXERCISES[k].name;e.unit=EXERCISES[k].unit;e.sets.forEach(s=>{if(!s.done){s.w='';s.r='';s.pr=false;}});if(keep){S.overrides.days=S.overrides.days||{};S.overrides.days[wo.dayKey]=S.overrides.days[wo.dayKey]||{};S.overrides.days[wo.dayKey][old]={...(S.overrides.days[wo.dayKey][old]||{}),sub:k};saveOverrides();}save('workouts',wo.id,wo);closeSheet();render();toast('Swapped to '+EXERCISES[k].name);};
    $$('[data-k]',p).forEach(b=>b.onclick=()=>apply(b.dataset.k));$('#sw-sel',p).onchange=ev=>{if(ev.target.value)apply(ev.target.value);};
    $('#sw-no',p).onclick=closeSheet;$('#sw-del',p).onclick=()=>{wo.exercises.splice(ei,1);save('workouts',wo.id,wo);closeSheet();render();};
  });
}
function finishSheet(wo){
  const {volume,sets}=workoutVolume(wo);const total=wo.exercises.reduce((a,e)=>a+e.sets.length,0);const mins=Math.round((Date.now()-wo.startedAt)/60000);
  sheet('<div class="h2">Finish '+esc(wo.label)+'?</div><div class="grid3"><div class="tile"><div class="v">'+sets+'<span class="u">/'+total+'</span></div><div class="l">sets done</div></div><div class="tile"><div class="v">'+Math.round(volume/1000*10)/10+'k</div><div class="l">'+S.profile.liftUnit+' moved</div></div><div class="tile"><div class="v">'+mins+'</div><div class="l">minutes</div></div></div>'+(wo.prs.length?'<div class="callout"><b>PRs today:</b> '+wo.prs.map(p=>esc(p.name)+' '+fmtSet(p.key,p)).join(' · ')+'</div>':'')+(sets<total?'<p class="note">Unchecked sets are dropped from the record. The log keeps only what you did.</p>':'')+'<div class="grid2"><button class="btn" id="fi-no">Keep going</button><button class="btn primary" id="fi-ok">'+ICON.check+' Finish</button></div>',p=>{
    $('#fi-no',p).onclick=closeSheet;$('#fi-ok',p).onclick=()=>{wo.finishedAt=Date.now();wo.durationMin=mins;wo.exercises.forEach(e=>{e.sets=e.sets.filter(s=>s.done);});wo.exercises=wo.exercises.filter(e=>e.sets.length);const v2=workoutVolume(wo);wo.volume=v2.volume;wo.setsDone=v2.sets;save('workouts',wo.id,wo);Rest.stop();closeSheet();toast('Workout saved');setSub('workout:'+wo.id);};
  });
}
function historyView(){
  const list=finishedWorkouts();
  return '<div class="row between">'+backBtn('Program')+'</div><div class="h1">History</div>'+(list.length?'<div class="card"><div class="list">'+list.map(w=>'<div class="item clickable" data-w="'+w.id+'"><div class="grow"><div class="t">'+esc(w.label)+' <span class="muted" style="font-weight:400">· '+fmtDate(w.date)+'</span></div><div class="s">'+(w.setsDone||workoutVolume(w).sets)+' sets · '+Math.round((w.volume||workoutVolume(w).volume)/1000*10)/10+'k '+S.profile.liftUnit+' · '+(w.durationMin||'–')+' min'+(w.prs&&w.prs.length?' · <span style="color:var(--bronze);font-weight:700">'+w.prs.length+' PR</span>':'')+'</div></div>'+chev()+'</div>').join('')+'</div></div>':'<div class="empty"><b>No workouts yet</b>Your first finished session shows up here with sets, volume and PRs.</div>');
}
function bindHistory(v){$('[data-back]',v).onclick=()=>setSub(null);$$('[data-w]',v).forEach(b=>b.onclick=()=>setSub('workout:'+b.dataset.w));}
function workoutDetail(id){
  const w=S.workouts[id];if(!w)return '<div class="card">Not found</div>';const vol=workoutVolume(w);
  return '<div class="row between">'+backBtn('History')+'</div><div><div class="eyebrow disp">'+fmtDateLong(w.date)+' · week '+w.week+'</div><div class="h1" style="margin-top:6px">'+esc(w.label)+'</div></div>'
  +'<div class="grid3"><div class="tile"><div class="v">'+vol.sets+'</div><div class="l">sets</div></div><div class="tile"><div class="v">'+Math.round(vol.volume/1000*10)/10+'k</div><div class="l">'+S.profile.liftUnit+' moved</div></div><div class="tile"><div class="v">'+(w.durationMin||'–')+'</div><div class="l">minutes</div></div></div>'
  +(w.prs&&w.prs.length?'<div class="callout"><b>PRs:</b> '+w.prs.map(p=>esc(p.name)+' '+fmtSet(p.key,p)).join(' · ')+'</div>':'')
  +'<div class="card"><div class="list">'+w.exercises.map(e=>'<div class="item clickable" data-ex="'+e.key+'"><div class="grow"><div class="t">'+esc(e.name)+'</div><div class="s">'+e.sets.map(s=>fmtSet(e.key,s)+(s.pr?' ★':'')).join(' · ')+'</div></div>'+chev()+'</div>').join('')+'</div></div>'
  +(w.notes?'<div class="card flat"><div class="eyebrow">Notes</div><p style="margin-top:4px">'+esc(w.notes)+'</p></div>':'')
  +'<button class="btn danger block" id="wd-del">'+ICON.trash+' Delete workout</button>';
}
function bindWorkoutDetail(v,id){$('[data-back]',v).onclick=()=>setSub('history');$$('[data-ex]',v).forEach(b=>b.onclick=()=>setSub('exercise:'+b.dataset.ex));$('#wd-del',v).onclick=()=>confirmSheet('Delete this workout?','It will be removed from your history and PR calculations.','Delete',()=>{remove('workouts',id);setSub('history');},true);}
function exerciseDetail(key){
  const ex=EXERCISES[key];if(!ex)return '<div class="card">Unknown exercise</div>';
  const sessions=finishedWorkouts().map(w=>{const e=w.exercises.find(x=>x.key===key);if(!e)return null;const done=e.sets.filter(s=>s.done!==false);if(!done.length)return null;const best=done.reduce((a,s)=>setScore(key,s)>setScore(key,a)?s:a,done[0]);return {date:w.date,best,score:setScore(key,best),sets:done,vol:done.reduce((a,s)=>a+num(s.w)*num(s.r),0)};}).filter(Boolean).reverse();
  const d0=sessions.length?sessions[0].date:todayISO();const pts=sessions.map(s=>({x:daysBetween(d0,s.date),y:round(s.score,1)}));
  const metric=ex.unit==='time'?'seconds':ex.unit==='bw'?'score (reps, or est. 1RM with added weight)':'estimated 1RM ('+S.profile.liftUnit+')';
  const slot=PROGRAM.order.map(k=>({k,e:PROGRAM.days[k].ex.find(x=>x.key===key)})).find(x=>x.e);
  return '<div class="row between">'+backBtn('Back')+'</div><div><div class="eyebrow disp">'+esc(ex.muscles)+'</div><div class="h1" style="margin-top:6px">'+esc(ex.name)+'</div>'+(slot?'<div class="small muted" style="margin-top:2px">'+esc(PROGRAM.days[slot.k].label)+' · '+slot.e.sets+' × '+esc(slot.e.reps)+' · rest '+fmtClock(slot.e.rest)+'</div>':'')+'</div>'
  +demoCard(key,{large:true})
  +(ILLUS_NOTES[key]?'<p class="note">Illustration: '+esc(ILLUS_NOTES[key])+'</p>':'')
  +'<div class="card"><div class="why">'+esc(ex.why)+'</div><div style="margin-top:12px"><div class="k">Technique</div><div class="stack tight">'+ex.cues.map(c=>'<div class="cue">'+esc(c)+'</div>').join('')+'</div></div><div style="margin-top:12px"><div class="k">Watch out for</div><div class="stack tight">'+ex.mistakes.map(c=>'<div class="cue bad">'+esc(c)+'</div>').join('')+'</div></div>'+(SAFETY[key]?'<div style="margin-top:12px"><div class="k">Joint safety · physio notes</div><div class="stack tight">'+SAFETY[key].map(c=>'<div class="cue good">'+esc(c)+'</div>').join('')+'</div></div>':'')+'<div class="grid2" style="margin-top:12px"><div><div class="k">Tempo</div><div class="small">'+esc(ex.tempo)+'</div></div><div><div class="k">Breathing</div><div class="small">'+esc(ex.breathe)+'</div></div></div><div style="margin-top:12px"><div class="k">Choosing the weight</div><div class="small">'+esc(ex.load)+'</div></div></div>'
  +(ILLUS&&ILLUS[key]&&ANIMS[ex.anim||key]?'<div class="card"><div class="eyebrow b">Muscle map · stylised</div><p class="note" style="margin:4px 0 10px">The working muscles light up in bronze through the rep. Use the illustration above for the exact positions and this for where to feel it.</p>'+demoCard(key,{force3d:true,caption:false})+'</div>':'')
  +'<div class="card">'+videoCards(key,'Deeper dive · professional coaching')+'</div>'
  +'<div class="card"><div class="row between"><div class="eyebrow">Progress · '+esc(metric)+'</div>'+(sessions.length?'<span class="pill bronze">best '+fmtSet(key,sessions.reduce((a,s)=>s.score>a.score?s:a,sessions[0]).best)+'</span>':'')+'</div>'+lineChart({series:[{pts,cls:'bronze'}],h:140,emptyTitle:'No sessions logged',emptyNote:'Log a session and the trend draws itself.',xLabels:pts.length>1?[{x:pts[0].x,label:fmtDate(sessions[0].date,false)},{x:pts[pts.length-1].x,label:fmtDate(sessions[sessions.length-1].date,false)}]:[]})+'</div>'
  +(sessions.length?'<div class="card"><div class="list">'+sessions.slice().reverse().slice(0,10).map(s=>'<div class="item"><div class="grow"><div class="t" style="font-weight:500">'+fmtDate(s.date)+'</div><div class="s">'+s.sets.map(x=>fmtSet(key,x)).join(' · ')+'</div></div><div class="num">'+round(s.score,0)+'</div></div>').join('')+'</div></div>':'')
  +(slot?'<button class="btn block" id="ex-edit">Edit this slot in the plan</button>':'');
}
function bindExercise(v,key){$('[data-back]',v).onclick=()=>{const p=S.ui.prevSub;setSub(p&&p!=='exercise:'+key?p:null);};const ed=$('#ex-edit',v);if(ed)ed.onclick=()=>editPlanSheet(key);}
function editPlanSheet(key){
  const dayKey=PROGRAM.order.find(k=>PROGRAM.days[k].ex.some(e=>e.key===key))||null;const cur=dayKey?(((S.overrides.days||{})[dayKey]||{})[key]||{}):{};const base=dayKey?PROGRAM.days[dayKey].ex.find(e=>e.key===key):null;
  if(!base)return toast('This exercise is a substitute; edit the original slot instead.');
  sheet('<div class="h2">Edit '+esc(EXERCISES[key].name)+'</div><p class="note">In '+esc(PROGRAM.days[dayKey].label)+'. Plan: '+base.sets+' × '+esc(base.reps)+'. Changes apply from the next session; weekly phase rules still apply on top.</p><div class="grid2"><div class="field"><label>Sets</label><input class="input num" id="ep-sets" type="number" inputmode="numeric" value="'+(cur.sets||base.sets)+'"></div><div class="field"><label>Reps</label><input class="input num" id="ep-reps" type="text" value="'+esc(cur.reps||base.reps)+'"></div></div><div class="field"><label>Replace with</label><select class="input" id="ep-sub"><option value="">Keep '+esc(EXERCISES[key].name)+'</option>'+Object.keys(EXERCISES).filter(k=>k!==key).sort((a,b)=>EXERCISES[a].name.localeCompare(EXERCISES[b].name)).map(k=>'<option value="'+k+'"'+(cur.sub===k?' selected':'')+'>'+esc(EXERCISES[k].name)+'</option>').join('')+'</select></div><div class="grid2"><button class="btn" id="ep-reset">Reset to plan</button><button class="btn primary" id="ep-save">Save</button></div>',p=>{
    $('#ep-save',p).onclick=()=>{S.overrides.days=S.overrides.days||{};S.overrides.days[dayKey]=S.overrides.days[dayKey]||{};S.overrides.days[dayKey][key]={sets:Math.max(1,num($('#ep-sets',p).value,base.sets)),reps:$('#ep-reps',p).value.trim()||base.reps,sub:$('#ep-sub',p).value||undefined};saveOverrides();closeSheet();render();toast('Plan updated');};
    $('#ep-reset',p).onclick=()=>{if(S.overrides.days&&S.overrides.days[dayKey])delete S.overrides.days[dayKey][key];saveOverrides();closeSheet();render();toast('Back to the plan');};
  });
}
function libraryView(){
  let html='<div class="row between">'+backBtn('Program')+'</div><div><div class="eyebrow disp">Library</div><div class="h1" style="margin-top:6px">Every lift, taught</div><p class="note" style="margin-top:8px">Each movement animates the two positions that matter. Tap one for the why, the cues, the common mistakes and the professional coaching videos.</p></div>';
  const row=(k,e)=>{const x=EXERCISES[k];return '<div class="item clickable" data-ex="'+k+'" style="display:block"><div class="exrow"><div>'+demoCard(k,{caption:false})+'</div><div class="grow"><div class="t">'+esc(x.name)+'</div><div class="s">'+esc(x.muscles)+(e?'<br>'+e.sets+' × '+esc(e.reps):'')+'</div></div>'+chev()+'<div class="why-s">'+esc(x.why)+'</div></div></div>';};
  for(const k of PROGRAM.order){const d=PROGRAM.days[k];html+='<div class="card"><div class="eyebrow b">'+esc(d.label)+' · '+esc(d.focus)+'</div><div class="list">'+d.ex.map(e=>row(e.key,e)).join('')+'</div></div>';}
  const extra=Object.keys(EXERCISES).filter(k=>!PROGRAM.order.some(d=>PROGRAM.days[d].ex.some(e=>e.key===k)));
  html+='<div class="card"><div class="eyebrow">Substitutes</div><div class="list">'+extra.map(k=>row(k,null)).join('')+'</div></div>';
  return html;
}
function bindLibrary(v){$('[data-back]',v).onclick=()=>setSub(null);$$('[data-ex]',v).forEach(b=>b.onclick=e=>{if(e.target.closest('.demo'))return;setSub('exercise:'+b.dataset.ex);});}

// ===================== VIEW: RUN =====================
const RUN_TYPES={easy:'Easy run',track:'Track session',long:'Long run',tempo:'Tempo',timetrial:'Time trial',other:'Other'};
function runsThisWeek(iso){const start=addDays(iso,-((parseISO(iso).getDay()+6)%7));return sorted('runs').filter(r=>r.date>=start&&r.date<=addDays(start,6));}
Views.run=function(){
  const sub=S.ui.sub||'';
  if(sub==='track')return stopwatchView();
  if(sub==='interval')return intervalView();
  if(sub==='history')return runHistoryView();
  if(sub.startsWith('run:'))return runDetail(sub.slice(4));
  return runHub();
};
Views.run.bind=function(v){
  const sub=S.ui.sub||'';
  if(sub==='track')return bindStopwatch(v);
  if(sub==='interval')return bindInterval(v);
  if(sub==='history')return bindRunHistory(v);
  if(sub.startsWith('run:'))return bindRunDetail(v,sub.slice(4));
  return bindRunHub(v);
};
function runHub(){
  const t=todayISO(),w=weekOf(t),p=runPlanFor(w);const wk=runsThisWeek(t);const has=k=>wk.some(r=>r.type===k||(k==='track'&&['tempo','timetrial'].includes(r.type)));
  const T=targets();const tr=p.track;const repT=tr.dist?repTarget(tr.dist):null;
  const sessions=[{k:'easy',day:'Tuesday',d:'Easy run '+p.easy.min+' min',target:paceWin(T.easy[0],T.easy[1])+' /km'},{k:'track',day:'Wednesday',d:tr.label,target:tr.type==='intervals'&&repT?fmtClock(repT[0])+'–'+fmtClock(repT[1])+' per rep':tr.type==='tempo'?paceWin(T.tempo[0],T.tempo[1])+' /km':'under '+fmtClock(T.timetrial)},{k:'long',day:'Saturday',d:'Long easy run '+p.long.min+' min',target:paceWin(T.long[0],T.long[1])+' /km'}];
  const recent=sorted('runs').slice(0,5);
  return '<div class="hero"><div class="row between" style="align-items:flex-start"><div><div class="eyebrow disp">Running · '+esc(weekLabel(w))+'</div><div class="h1" style="margin-top:8px">The engine</div><div class="small muted" style="margin-top:6px">Targets come from your 5 km time of <b style="color:var(--fg)">'+fmtClock(S.profile.fiveKSec)+'</b>. Beat it and every target moves.</div></div></div><div class="meander"></div></div>'
  +'<div class="card"><div class="list">'+sessions.map(s=>'<div class="item" style="align-items:flex-start"><div class="grow"><div class="eyebrow b">'+s.day+'</div><div class="t" style="font:800 20px/1.05 var(--head);text-transform:uppercase;margin-top:3px">'+esc(s.d)+'</div><div class="s" style="margin-top:3px">Target <b style="color:var(--fg)">'+esc(s.target)+'</b> · '+esc(RUN_BRIEFS[s.k].feel.split('.')[0])+'.</div></div>'+(has(s.k)?'<span class="pill good">'+ICON.check+' Done</span>':'<button class="btn sm primary" data-go="'+s.k+'">Start</button>')+'</div>').join('')+'</div></div>'
  +'<div class="grid2"><button class="btn" id="r-free">Stopwatch + laps</button><button class="btn" id="r-manual">Log a run</button></div>'
  +'<div class="card"><div class="demo-row"><div>'+demoCard('running',{caption:false})+'</div><div><div class="k">The three paces</div><div class="stack tight">'+PACES.map(x=>'<div class="cue"><b>'+esc(x.k)+'</b>&nbsp;'+esc(x.d)+'</div>').join('')+'</div></div></div><div class="grid3" style="margin-top:12px"><div class="target"><span class="tv">'+paceWin(T.easy[0],T.easy[1])+'</span><span class="tl">easy /km</span></div><div class="target"><span class="tv">'+paceWin(T.tempo[0],T.tempo[1])+'</span><span class="tl">tempo /km</span></div><div class="target"><span class="tv">'+fmtClock(T.rep[400][0])+'–'+fmtClock(T.rep[400][1])+'</span><span class="tl">400 m rep</span></div></div><div style="margin-top:12px">'+videoCards('running_strides','Strides, done right')+'</div></div>'
  +'<div class="card flat"><div class="h3">Import from your watch</div><p class="note">A GPX file from Strava, Apple Health (via an export app) or Garmin gives distance, time, per-km splits and max speed.</p><label class="btn sm" style="margin-top:8px;display:inline-flex">Choose GPX file<input type="file" id="r-gpx" accept=".gpx,application/gpx+xml" hidden></label></div>'
  +(recent.length?'<div class="card"><div class="row between"><div class="eyebrow">Recent</div><button class="btn ghost sm" id="r-history">All runs</button></div><div class="list">'+recent.map(r=>runRow(r)).join('')+'</div></div>':'<div class="card"><div class="empty"><b>No runs logged yet</b>Start a session, log one from your watch, or import a GPX.</div><button class="btn ghost sm block" id="r-history">History</button></div>');
}
function runRow(r){return '<div class="item clickable" data-run="'+r.id+'"><div class="grow"><div class="t">'+esc(RUN_TYPES[r.type]||r.type)+' <span class="muted" style="font-weight:400">· '+fmtDate(r.date)+'</span></div><div class="s">'+(r.distanceM?(r.distanceM/1000).toFixed(2)+' km · ':'')+fmtClock(r.durationS)+(r.distanceM&&r.durationS?' · '+fmtPace(r.durationS/(r.distanceM/1000))+' /km':'')+(r.reps&&r.reps.length?' · '+r.reps.length+' reps, best '+fmtClock(Math.min(...r.reps.map(x=>x.s))):'')+'</div></div>'+ICON.chev.replace('<svg','<svg style="width:16px;height:16px;stroke:var(--fg2);fill:none;stroke-width:2"')+'</div>';}
function bindRunHub(v){
  $('#r-history',v).onclick=()=>setSub('history');
  $$('[data-go]',v).forEach(b=>b.onclick=()=>{const k=b.dataset.go;if(k==='track'){SW.reset();SW.mode={kind:'interval'};setSub('interval');}else{SW.reset();SW.mode={kind:'free',type:k};setSub('track');}});
  $('#r-free',v).onclick=()=>{if(!SW.running&&!SW.laps.length)SW.mode={kind:'free',type:'easy'};setSub('track');};
  $('#r-manual',v).onclick=()=>manualRunSheet();
  $('#r-gpx',v).onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importGPX(f);};
  $$('[data-run]',v).forEach(b=>b.onclick=()=>setSub('run:'+b.dataset.run));
}
function manualRunSheet(pre){
  pre=pre||{};const t=todayISO();
  sheet('<div class="h2">Log a run</div><div class="grid2"><div class="field"><label>Type</label><select class="input" id="mr-type">'+Object.entries(RUN_TYPES).map(([k,l])=>'<option value="'+k+'"'+((pre.type||runForDate(t)||'easy')===k?' selected':'')+'>'+l+'</option>').join('')+'</select></div><div class="field"><label>Date</label><input class="input" type="date" id="mr-date" value="'+(pre.date||t)+'"></div></div><div class="grid2"><div class="field"><label>Distance (km)</label><input class="input num" id="mr-dist" type="number" inputmode="decimal" step="0.01" value="'+(pre.distanceM?round(pre.distanceM/1000,2):'')+'"></div><div class="field"><label>Time (mm:ss)</label><input class="input num" id="mr-time" type="text" inputmode="numeric" placeholder="32:10" value="'+(pre.durationS?fmtClock(pre.durationS):'')+'"></div></div><div class="field"><label>Notes</label><input class="input" id="mr-notes" placeholder="How it felt, route, weather" value="'+esc(pre.notes||'')+'"></div><div class="grid2"><button class="btn" id="mr-no">Cancel</button><button class="btn primary" id="mr-ok">Save run</button></div>',p=>{
    $('#mr-no',p).onclick=closeSheet;$('#mr-ok',p).onclick=()=>{const parts=$('#mr-time',p).value.split(':').map(Number).filter(n=>!isNaN(n));let s=0;if(parts.length===3)s=parts[0]*3600+parts[1]*60+parts[2];else if(parts.length===2)s=parts[0]*60+parts[1];else if(parts.length===1)s=parts[0]*60;const r={id:pre.id||uid(),date:$('#mr-date',p).value||t,type:$('#mr-type',p).value,distanceM:Math.round(num($('#mr-dist',p).value)*1000),durationS:Math.round(s),notes:$('#mr-notes',p).value.trim(),source:pre.source||'manual',laps:pre.laps||[],reps:pre.reps||[],splits:pre.splits||[]};if(!r.durationS&&!r.distanceM)return toast('Add a distance or a time');save('runs',r.id,r);closeSheet();toast('Run saved');render();};
  });
}
function briefBlock(kind,extra){const b=RUN_BRIEFS[kind]||RUN_BRIEFS.easy;return '<details class="coach"'+(SW.running||SW.before?'':' open')+'><summary>'+esc(b.title)+' · why and how</summary><div class="body"><div class="why">'+esc(b.purpose)+'</div><div><div class="k">How it should feel</div><div class="small">'+esc(b.feel)+'</div></div>'+(extra||'')+'<div><div class="k">The session</div><div class="steps">'+b.steps.map((x,i)=>'<div class="st"><b>'+(i+1)+'</b><div>'+esc(x)+'</div></div>').join('')+'</div></div></div></details>';}
function stopwatchView(){
  const m=SW.mode||{kind:'free',type:'easy'};const lapM=SW.lapM;const T=targets();const win=m.type==='long'?T.long:T.easy;
  const laps=SW.laps;const dist=laps.reduce((a,l)=>a+l.m,0);const el=SW.elapsed();const avgPace=dist?el/1000/(dist/1000):0;const last=laps[laps.length-1];
  const bestMs=laps.length?Math.min(...laps.map(l=>l.ms/l.m)):0;
  return '<div class="row between">'+backBtn('Running')+'<span class="pill bronze">'+esc(RUN_TYPES[m.type]||'Run')+' · laps of '+lapM+' m</span></div>'
  +briefBlock(m.type==='long'?'long':'easy','<div class="grid2"><div class="target"><span class="tv">'+paceWin(win[0],win[1])+'</span><span class="tl">target /km</span></div><div class="target"><span class="tv">'+fmtClock(win[0]*lapM/1000)+'–'+fmtClock(win[1]*lapM/1000)+'</span><span class="tl">per '+lapM+' m lap</span></div></div>')
  +'<div class="card"><div class="clock"><div class="huge" id="sw-time">'+fmtClockMs(el)+'</div><div class="sub"><span>lap <b id="sw-lap">'+fmtClockMs(SW.lapSince())+'</b></span><span>dist <b id="sw-dist">'+(dist/1000).toFixed(2)+' km</b></span><span>avg <b id="sw-pace">'+fmtPace(avgPace)+'</b> /km</span></div></div>'
  +'<div class="stack" style="margin-top:8px">'+(!SW.running&&!SW.before?'<div class="seg" id="sw-lapsel">'+[200,400,800,1000].map(x=>'<button aria-pressed="'+(lapM===x)+'" data-lap="'+x+'">'+x+' m</button>').join('')+'</div><button class="lapbtn go" id="sw-start">Start</button>':SW.running?'<button class="lapbtn" id="sw-lapbtn">Lap · '+lapM+' m</button><div class="grid2"><button class="btn" id="sw-pause">Pause</button><button class="btn primary" id="sw-finish">Finish</button></div>':'<button class="lapbtn go" id="sw-resume">Resume</button><div class="grid2"><button class="btn danger" id="sw-discard">Discard</button><button class="btn primary" id="sw-finish">Finish</button></div>')+'</div></div>'
  +(laps.length?'<div class="card"><div class="row between"><div class="eyebrow">Splits</div>'+(last?'<span class="pill accent">last '+fmtPace(last.ms/1000/(last.m/1000))+' /km · '+fmtKmh(last.m/(last.ms/1000))+' km/h</span>':'')+'</div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>Lap</th><th>Time</th><th>Pace /km</th><th>km/h</th><th>Total</th></tr></thead><tbody>'+laps.slice().reverse().map(l=>'<tr class="'+(l.ms/l.m===bestMs?'best':'')+'"><td>'+l.n+'</td><td>'+fmtClockMs(l.ms)+'</td><td>'+fmtPace(l.ms/1000/(l.m/1000))+'</td><td>'+fmtKmh(l.m/(l.ms/1000))+'</td><td>'+fmtClock(l.at/1000)+'</td></tr>').join('')+'</tbody></table></div></div>':'<div class="card flat"><p class="note">Press <b>Lap</b> each time you pass the start line. On a standard track the inside lane is 400 m; the app turns every lap into pace and speed. Keep the screen on; the clock keeps counting while this page is open.</p></div>');
}
function bindStopwatch(v){
  $('[data-back]',v).onclick=()=>setSub(null);
  SW.onTick=()=>{const t=$('#sw-time');if(!t)return;t.textContent=fmtClockMs(SW.elapsed());$('#sw-lap').textContent=fmtClockMs(SW.lapSince());};
  $$('[data-lap]',v).forEach(b=>b.onclick=()=>{SW.lapM=+b.dataset.lap;render();});
  const st=$('#sw-start',v);if(st)st.onclick=()=>{SW.start();render();};
  const lb=$('#sw-lapbtn',v);if(lb)lb.onclick=()=>{SW.lap();render();};
  const pa=$('#sw-pause',v);if(pa)pa.onclick=()=>{SW.pause();render();};
  const re=$('#sw-resume',v);if(re)re.onclick=()=>{SW.start();render();};
  const di=$('#sw-discard',v);if(di)di.onclick=()=>confirmSheet('Discard this run?','The clock and laps will be cleared.','Discard',()=>{SW.reset();setSub(null);},true);
  const fi=$('#sw-finish',v);if(fi)fi.onclick=()=>{SW.pause();const dist=SW.laps.reduce((a,l)=>a+l.m,0);const laps=SW.laps.map(l=>({n:l.n,s:round(l.ms/1000,1),m:l.m}));manualRunSheet({type:(SW.mode&&SW.mode.type)||'easy',distanceM:dist,durationS:SW.elapsed()/1000,laps,source:'stopwatch'});const ok=$('#mr-ok');const orig=ok.onclick;ok.onclick=()=>{orig();if($('#sheet').hidden){SW.reset();}};};
}
// ----- Structured track session -----
const IV={state:'idle',rep:0,reps:[],restEnd:0,t:null,plan:null};
function intervalPlan(){const p=runPlanFor(weekOf(todayISO())).track;return p;}
function intervalView(){
  const p=IV.plan||intervalPlan();const el=SW.elapsed();
  let main='';
  if(p.type==='intervals'){
    const total=p.reps;const cur=IV.rep;
    if(IV.state==='idle')main='<div class="clock"><div class="eyebrow">'+esc(p.label)+'</div><div class="h1" style="margin-top:6px">'+total+' reps · '+p.dist+' m · '+fmtClock(p.rest)+' rest</div><p class="note" style="margin-top:8px">Warm up first: 10 min easy jog and 4 relaxed strides. Then press Start at the line; press <b>Rep done</b> when you cross the finish of each rep. The rest countdown beeps at 10 s and at go.</p></div><button class="lapbtn go" id="iv-start">Start rep 1</button>';
    else if(IV.state==='rep')main='<div class="clock"><div class="eyebrow">Rep '+cur+' of '+total+' · '+p.dist+' m</div><div class="huge" id="iv-time">'+fmtClockMs(SW.lapSince())+'</div><div class="sub"><span>total <b id="iv-total">'+fmtClock(el/1000)+'</b></span>'+(IV.reps.length?'<span>avg rep <b>'+fmtClock(IV.reps.reduce((a,r)=>a+r.s,0)/IV.reps.length)+'</b></span>':'')+'</div></div><button class="lapbtn" id="iv-done">Rep done</button>';
    else if(IV.state==='rest')main='<div class="clock"><div class="eyebrow">Rest · next rep '+(cur+1)+' of '+total+'</div><div class="huge" id="iv-time" style="color:var(--good)">'+fmtClock(Math.max(0,Math.ceil((IV.restEnd-Date.now())/1000)))+'</div><div class="sub"><span>last rep <b>'+fmtClock(IV.reps[IV.reps.length-1].s)+'</b> · '+fmtPace(IV.reps[IV.reps.length-1].s/(p.dist/1000))+' /km</span></div></div><div class="grid2"><button class="btn" id="iv-skiprest">Skip rest</button><button class="lapbtn go" id="iv-go" style="min-height:52px;font-size:20px">Go now</button></div>';
    else if(IV.state==='done')main='<div class="clock"><div class="eyebrow">Session complete</div><div class="h1">'+IV.reps.length+' × '+p.dist+' m</div><div class="sub"><span>avg <b>'+fmtClock(IV.reps.reduce((a,r)=>a+r.s,0)/IV.reps.length)+'</b></span><span>best <b>'+fmtClock(Math.min(...IV.reps.map(r=>r.s)))+'</b></span></div></div><button class="btn primary block" id="iv-save">Save session</button>';
  }else if(p.type==='tempo'){
    const segs=[{n:'Easy',min:10},{n:'Tempo',min:p.min},{n:'Easy',min:10}];let acc=0,segi=0,segStart=0;for(let i=0;i<segs.length;i++){if(el/60000<acc+segs[i].min){segi=i;segStart=acc;break;}acc+=segs[i].min;segi=i;segStart=acc-segs[i].min;}
    const left=Math.max(0,(segStart+segs[segi].min)*60-el/1000);
    main='<div class="clock"><div class="eyebrow">'+esc(p.label)+'</div><div class="huge" id="iv-time">'+fmtClock(el/1000)+'</div><div class="sub"><span>'+(IV.state==='idle'?'3 segments':esc(segs[segi].n)+' · <b id="iv-left">'+fmtClock(left)+'</b> left')+'</span></div></div>'+(IV.state==='idle'?'<button class="lapbtn go" id="iv-start">Start</button>':SW.running?'<button class="lapbtn" id="iv-lap">Lap</button><div class="grid2"><button class="btn" id="iv-pause">Pause</button><button class="btn primary" id="iv-finish">Finish</button></div>':'<button class="lapbtn go" id="iv-resume">Resume</button><button class="btn primary block" id="iv-finish">Finish</button>');
  }else{
    main='<div class="clock"><div class="eyebrow">5 km time trial · 12.5 laps of 400 m</div><div class="huge" id="iv-time">'+fmtClockMs(el)+'</div><div class="sub"><span>laps <b>'+SW.laps.length+'</b></span><span>dist <b>'+(SW.laps.reduce((a,l)=>a+l.m,0)/1000).toFixed(2)+' km</b></span></div></div>'+(IV.state==='idle'?'<button class="lapbtn go" id="iv-start">Start</button>':SW.running?'<button class="lapbtn" id="iv-lap">Lap 400 m</button><button class="btn primary block" id="iv-finish">Finish at the line</button>':'<button class="lapbtn go" id="iv-resume">Resume</button><button class="btn primary block" id="iv-finish">Finish</button>');
  }
  const reps=IV.reps.length?'<div class="card"><div class="row between"><div class="eyebrow">Reps</div><span class="pill">green = on target</span></div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>Rep</th><th>Time</th><th>Pace /km</th><th>km/h</th><th>vs target</th></tr></thead><tbody>'+IV.reps.map((r,i)=>{const j=repJudge(r.m,r.s);const tt=repTarget(r.m);return '<tr class="'+(r.s===Math.min(...IV.reps.map(x=>x.s))?'best':'')+'"><td>'+(i+1)+'</td><td>'+fmtClock(r.s)+'</td><td>'+fmtPace(r.s/(r.m/1000))+'</td><td>'+fmtKmh(r.m/r.s)+'</td><td><span class="pill '+j+'">'+(j==='good'?'on':j==='warn'?'fast':'slow')+(tt?' · '+(r.s<tt[0]?'-'+Math.round(tt[0]-r.s)+'s':r.s>tt[1]?'+'+Math.round(r.s-tt[1])+'s':'')+'':'')+'</span></td></tr>';}).join('')+'</tbody></table></div></div>':'';
  const laps=SW.laps.length&&p.type!=='intervals'?'<div class="card"><div class="eyebrow">Laps</div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>Lap</th><th>Time</th><th>Pace /km</th><th>Total</th></tr></thead><tbody>'+SW.laps.slice().reverse().map(l=>'<tr><td>'+l.n+'</td><td>'+fmtClockMs(l.ms)+'</td><td>'+fmtPace(l.ms/1000/(l.m/1000))+'</td><td>'+fmtClock(l.at/1000)+'</td></tr>').join('')+'</tbody></table></div></div>':'';
  const T=targets();const rt=p.dist&&p.type==='intervals'?repTarget(p.dist):null;const extra=rt?'<div class="grid2"><div class="target"><span class="tv">'+fmtClock(rt[0])+'–'+fmtClock(rt[1])+'</span><span class="tl">target per '+p.dist+' m</span></div><div class="target"><span class="tv">'+fmtClock(p.rest)+'</span><span class="tl">rest between</span></div></div>':p.type==='tempo'?'<div class="target"><span class="tv">'+paceWin(T.tempo[0],T.tempo[1])+'</span><span class="tl">tempo /km</span></div>':'<div class="target"><span class="tv">'+fmtClock(T.timetrial)+'</span><span class="tl">target 5 km</span></div>';
  return '<div class="row between">'+backBtn('Running')+'<span class="pill bronze">Track · week '+weekOf(todayISO())+'</span></div>'+briefBlock(p.type==='tempo'?'tempo':p.type==='timetrial'?'timetrial':'track',extra)+'<div class="card">'+main+'</div>'+reps+laps;
}
function bindInterval(v){
  const p=IV.plan||(IV.plan=intervalPlan());
  $('[data-back]',v).onclick=()=>{if(IV.state!=='idle'&&IV.state!=='done')return confirmSheet('Leave the session?','The clock keeps running in the background of this page, but the session will be discarded if you start another.','Leave',()=>setSub(null));setSub(null);};
  SW.onTick=()=>{const t=$('#iv-time');if(!t)return;if(p.type==='intervals'){if(IV.state==='rep')t.textContent=fmtClockMs(SW.lapSince());const tot=$('#iv-total');if(tot)tot.textContent=fmtClock(SW.elapsed()/1000);}else if(p.type==='tempo'){t.textContent=fmtClock(SW.elapsed()/1000);const segs=[10,p.min,10];let acc=0,i=0;const m=SW.elapsed()/60000;for(i=0;i<segs.length;i++){if(m<acc+segs[i])break;acc+=segs[i];}if(i>=segs.length)i=segs.length-1;const left=$('#iv-left');if(left){const l=Math.max(0,(acc+segs[i])*60-SW.elapsed()/1000);left.textContent=fmtClock(l);if(l<=0.15&&!IV['seg'+i]){IV['seg'+i]=true;beep(3,988);buzz([200,100,200]);render();}}}else t.textContent=fmtClockMs(SW.elapsed());};
  const st=$('#iv-start',v);if(st)st.onclick=()=>{SW.reset();SW.lapM=p.dist||400;SW.start();IV.state=p.type==='intervals'?'rep':'run';IV.rep=1;IV.reps=[];render();};
  const dn=$('#iv-done',v);if(dn)dn.onclick=()=>{const l=SW.lap(p.dist);IV.reps.push({n:IV.rep,s:round(l.ms/1000,1),m:p.dist});beep(1,1175);if(IV.rep>=p.reps){IV.state='done';SW.pause();render();return;}IV.state='rest';IV.restEnd=Date.now()+p.rest*1000;IV.warned=false;clearInterval(IV.t);IV.t=setInterval(()=>{const left=(IV.restEnd-Date.now())/1000;const t=$('#iv-time');if(t)t.textContent=fmtClock(Math.max(0,Math.ceil(left)));if(left<=10&&!IV.warned){IV.warned=true;beep(2,660);buzz([80,60,80]);}if(left<=0){clearInterval(IV.t);beep(3,1318);buzz([300]);startRep();}},200);render();};
  function startRep(){clearInterval(IV.t);IV.rep+=1;IV.state='rep';SW.lap(0);SW.laps.pop();SW.laps.push({n:SW.laps.length+1,at:SW.elapsed(),ms:0,m:0});render();}
  const sk=$('#iv-skiprest',v);if(sk)sk.onclick=startRep;const gon=$('#iv-go',v);if(gon)gon.onclick=startRep;
  const lp=$('#iv-lap',v);if(lp)lp.onclick=()=>{SW.lap(400);render();};
  const pa=$('#iv-pause',v);if(pa)pa.onclick=()=>{SW.pause();render();};const re=$('#iv-resume',v);if(re)re.onclick=()=>{SW.start();render();};
  const fi=$('#iv-finish',v);if(fi)fi.onclick=()=>{SW.pause();const dist=SW.laps.reduce((a,l)=>a+l.m,0);manualRunSheet({type:p.type==='tempo'?'tempo':'timetrial',distanceM:dist||(p.type==='timetrial'?5000:0),durationS:SW.elapsed()/1000,laps:SW.laps.map(l=>({n:l.n,s:round(l.ms/1000,1),m:l.m})),source:'stopwatch'});const ok=$('#mr-ok');const orig=ok.onclick;ok.onclick=()=>{orig();if($('#sheet').hidden){SW.reset();IV.state='idle';}};};
  const sv=$('#iv-save',v);if(sv)sv.onclick=()=>{const reps=IV.reps.slice();const dist=reps.reduce((a,r)=>a+r.m,0);const r={id:uid(),date:todayISO(),type:'track',distanceM:dist,durationS:Math.round(SW.elapsed()/1000),reps,laps:[],notes:p.label,source:'track'};save('runs',r.id,r);SW.reset();IV.state='idle';IV.reps=[];toast('Track session saved');setSub('run:'+r.id);};
}
function runHistoryView(){const list=sorted('runs');return '<div class="row between">'+backBtn('Running')+'</div><div class="h1">Run history</div>'+(list.length?'<div class="card"><div class="list">'+list.map(runRow).join('')+'</div></div>':'<div class="empty"><b>Nothing yet</b></div>');}
function bindRunHistory(v){$('[data-back]',v).onclick=()=>setSub(null);$$('[data-run]',v).forEach(b=>b.onclick=()=>setSub('run:'+b.dataset.run));}
function runDetail(id){
  const r=S.runs[id];if(!r)return '<div class="card">Not found</div>';const pace=r.distanceM&&r.durationS?r.durationS/(r.distanceM/1000):0;
  let tbl='';
  if(r.reps&&r.reps.length)tbl='<div class="card"><div class="eyebrow">Reps</div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>Rep</th><th>Time</th><th>Pace /km</th><th>km/h</th></tr></thead><tbody>'+r.reps.map((x,i)=>'<tr class="'+(x.s===Math.min(...r.reps.map(y=>y.s))?'best':'')+'"><td>'+(i+1)+'</td><td>'+fmtClock(x.s)+'</td><td>'+fmtPace(x.s/(x.m/1000))+'</td><td>'+fmtKmh(x.m/x.s)+'</td></tr>').join('')+'</tbody></table></div><p class="note" style="margin-top:8px">Avg '+fmtClock(r.reps.reduce((a,x)=>a+x.s,0)/r.reps.length)+' · best '+fmtClock(Math.min(...r.reps.map(x=>x.s)))+' · spread '+Math.round(Math.max(...r.reps.map(x=>x.s))-Math.min(...r.reps.map(x=>x.s)))+' s (under 5 s means the pacing was right)</p></div>';
  else if(r.splits&&r.splits.length)tbl='<div class="card"><div class="eyebrow">Splits per km</div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>km</th><th>Time</th><th>km/h</th></tr></thead><tbody>'+r.splits.map(x=>'<tr class="'+(x.s===Math.min(...r.splits.map(y=>y.s))?'best':'')+'"><td>'+x.km+'</td><td>'+fmtClock(x.s)+'</td><td>'+fmtKmh(1000/x.s)+'</td></tr>').join('')+'</tbody></table></div></div>';
  else if(r.laps&&r.laps.length)tbl='<div class="card"><div class="eyebrow">Laps</div><div style="overflow-x:auto"><table class="splits"><thead><tr><th>Lap</th><th>Time</th><th>Pace /km</th><th>km/h</th></tr></thead><tbody>'+r.laps.filter(l=>l.m>0).map(l=>'<tr><td>'+l.n+'</td><td>'+fmtClock(l.s)+'</td><td>'+fmtPace(l.s/(l.m/1000))+'</td><td>'+fmtKmh(l.m/l.s)+'</td></tr>').join('')+'</tbody></table></div></div>';
  return '<div class="row between">'+backBtn('Running')+'</div><div><div class="eyebrow">'+fmtDateLong(r.date)+(r.source?' · '+esc(r.source):'')+'</div><div class="h1">'+esc(RUN_TYPES[r.type]||r.type)+'</div></div>'
  +'<div class="grid3"><div class="tile"><div class="v">'+(r.distanceM?(r.distanceM/1000).toFixed(2):'–')+'</div><div class="l">km</div></div><div class="tile"><div class="v">'+fmtClock(r.durationS)+'</div><div class="l">time</div></div><div class="tile"><div class="v">'+fmtPace(pace)+'</div><div class="l">/km avg</div></div></div>'
  +(r.maxKmh?'<div class="grid2"><div class="tile"><div class="v">'+r.maxKmh+'</div><div class="l">max km/h</div></div><div class="tile"><div class="v">'+fmtKmh(1000/pace)+'</div><div class="l">avg km/h</div></div></div>':'')
  +tbl+(r.notes?'<div class="card flat"><div class="eyebrow">Notes</div><p style="margin-top:4px">'+esc(r.notes)+'</p></div>':'')
  +'<div class="grid2"><button class="btn" id="rd-edit">Edit</button><button class="btn danger" id="rd-del">'+ICON.trash+' Delete</button></div>';
}
function bindRunDetail(v,id){$('[data-back]',v).onclick=()=>setSub(null);$('#rd-edit',v).onclick=()=>manualRunSheet(S.runs[id]);$('#rd-del',v).onclick=()=>confirmSheet('Delete this run?','','Delete',()=>{remove('runs',id);setSub(null);},true);}
function haversine(a,b){const R=6371000,toR=x=>x*Math.PI/180;const dLat=toR(b.lat-a.lat),dLon=toR(b.lon-a.lon);const h=Math.sin(dLat/2)**2+Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
async function importGPX(file){
  try{const txt=await file.text();const doc=new DOMParser().parseFromString(txt,'application/xml');const pts=$$('trkpt',doc).map(p=>({lat:parseFloat(p.getAttribute('lat')),lon:parseFloat(p.getAttribute('lon')),t:(p.querySelector('time')||{}).textContent})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
    if(pts.length<2)return toast('No track points found in that file');
    let dist=0;const splits=[];let nextKm=1000,lastKmTime=0,maxSpeed=0;const t0=pts[0].t?new Date(pts[0].t).getTime():0;
    for(let i=1;i<pts.length;i++){const d=haversine(pts[i-1],pts[i]);const ti=pts[i].t?new Date(pts[i].t).getTime():0,tp=pts[i-1].t?new Date(pts[i-1].t).getTime():0;if(ti&&tp&&ti>tp&&d>0){const sp=d/((ti-tp)/1000);if(sp<12&&(ti-tp)>=1000)maxSpeed=Math.max(maxSpeed,sp);}
      const before=dist;dist+=d;if(t0&&ti&&dist>=nextKm&&before<nextKm){const frac=(nextKm-before)/d;const tAt=tp+(ti-tp)*frac;splits.push({km:nextKm/1000,s:round((tAt-t0)/1000-lastKmTime,0)});lastKmTime=(tAt-t0)/1000;nextKm+=1000;}}
    const tEnd=pts[pts.length-1].t?new Date(pts[pts.length-1].t).getTime():0;const dur=t0&&tEnd?Math.round((tEnd-t0)/1000):0;const date=t0?localISO(new Date(t0)):todayISO();
    const r={id:uid(),date,type:runForDate(date)||'easy',distanceM:Math.round(dist),durationS:dur,splits,laps:[],reps:[],notes:'Imported from '+file.name,source:'gpx',maxKmh:maxSpeed?round(maxSpeed*3.6,1):undefined};
    save('runs',r.id,r);toast('Imported '+(dist/1000).toFixed(2)+' km');setSub('run:'+r.id);
  }catch(e){console.warn(e);toast('Could not read that GPX file');}
}

// ===================== VIEW: BODY =====================
Views.body=function(){
  const t=todayISO(),b=S.body[t]||{};const ws=weightSeries();const avg=weekAvg(ws,t),prev=weekAvg(ws,addDays(t,-7));const rate=avg&&prev?(avg-prev):null;const ratePct=rate!=null&&avg?rate/avg*100:null;
  const toGo=avg?avg-S.profile.targetWeightLb:null;const weeksLeft=toGo!=null&&rate&&rate<0?toGo/(-rate):null;
  const range=S.ui.bodyRange||90;const from=addDays(t,-range);const series=ws.filter(p=>p.date>=from||range>=3650);const trend=movingAvg(ws).filter(p=>p.date>=from||range>=3650);
  const d0=series.length?series[0].date:t;const toPts=arr=>arr.map(p=>({x:daysBetween(d0,p.date),y:p.v}));
  const waist=sorted('body',false).filter(x=>x.waistIn>0).map(x=>({date:x.date,v:x.waistIn}));const wd0=waist.length?waist[0].date:t;
  const steps=[];for(let i=13;i>=0;i--){const d=addDays(t,-i);steps.push({label:WD[parseISO(d).getDay()][0],v:num((S.body[d]||{}).steps)});}
  const photos=sorted('body').filter(x=>x.photos&&Object.keys(x.photos).length);const first=photos[photos.length-1],latest=photos[0];
  const xl=series.length>1?[{x:0,label:fmtDate(series[0].date,false)},{x:daysBetween(d0,series[series.length-1].date),label:fmtDate(series[series.length-1].date,false)}]:[];
  return '<div><div class="eyebrow disp">Body</div><div class="h1" style="margin-top:6px">'+(avg?avg.toFixed(1)+' lb':'Log your first weigh-in')+'</div>'+(avg?'<p class="note">7-day average. Scale today: '+(b.weightLb||'–')+' lb · target '+S.profile.targetWeightLb+' lb</p>':'')+'</div>'
  +'<div class="card"><div class="eyebrow">'+fmtDate(t)+' · morning, after the bathroom, before food</div><div class="grid3" style="margin-top:8px"><div class="field"><label for="b-w">Weight lb</label><input class="input num" id="b-w" type="number" inputmode="decimal" step="0.1" value="'+(b.weightLb||'')+'" placeholder="'+(ws.length?ws[ws.length-1].v:S.profile.startWeightLb)+'"></div><div class="field"><label for="b-waist">Waist in</label><input class="input num" id="b-waist" type="number" inputmode="decimal" step="0.1" value="'+(b.waistIn||'')+'" placeholder="weekly"></div><div class="field"><label for="b-steps">Steps</label><input class="input num" id="b-steps" type="number" inputmode="numeric" value="'+(b.steps||'')+'" placeholder="'+S.profile.stepsGoal+'"></div></div><button class="btn primary block" id="b-save" style="margin-top:10px">'+ICON.check+' Save today</button></div>'
  +'<div class="grid2"><div class="tile"><div class="v">'+(rate!=null?(rate>0?'+':'')+rate.toFixed(1):'–')+' <span class="u">lb/wk</span></div><div class="l">Trend</div><div class="d">'+(ratePct!=null?Math.abs(ratePct).toFixed(2)+'% of body weight · aim 0.3–0.5%':'needs two weeks of data')+'</div></div><div class="tile"><div class="v">'+(toGo!=null?Math.max(0,toGo).toFixed(1):'–')+' <span class="u">lb</span></div><div class="l">To target</div><div class="d">'+(weeksLeft?'~'+Math.ceil(weeksLeft)+' weeks at this rate':'rate not yet known')+'</div></div></div>'
  +'<div class="card"><div class="row between"><div class="eyebrow">Weight · dots are the scale, the line is the trend</div><div class="seg" style="padding:2px">'+[30,90,3650].map(r=>'<button data-range="'+r+'" aria-pressed="'+(range===r)+'" style="padding:5px 8px;font-size:12px">'+(r===3650?'All':r+'d')+'</button>').join('')+'</div></div>'+lineChart({series:[{pts:toPts(series),dots:true,cls:'faint'},{pts:toPts(trend),cls:''}],target:S.profile.targetWeightLb,targetLabel:'target '+S.profile.targetWeightLb,h:170,yFmt:v=>Math.round(v),xLabels:xl,emptyTitle:'No weigh-ins yet',emptyNote:'Daily weigh-ins turn into a trend line here. The trend sits above the scale while you lose; that lag is normal.'})+'</div>'
  +'<div class="card"><div class="eyebrow">Waist at the navel · inches</div>'+lineChart({series:[{pts:waist.map(p=>({x:daysBetween(wd0,p.date),y:p.v})),cls:'bronze'}],h:120,yFmt:v=>round(v,1),emptyTitle:'No waist measurements',emptyNote:'Once a week, same morning. For a V-taper this number matters more than the scale.'})+'</div>'
  +'<div class="card"><div class="eyebrow">Steps · last 14 days (entered by hand; Apple Health sync needs the native app)</div>'+barChart({bars:steps,target:S.profile.stepsGoal,h:120})+'</div>'
  +'<div class="card"><div class="row between"><div class="eyebrow">Progress photos · every 2 weeks, same light</div><label class="btn sm">'+ICON.camera+' Add<input type="file" id="b-photo" accept="image/*" multiple hidden'+(Caps.assets?'':' disabled')+'></label></div>'+(Caps.assets?'':'<p class="note">Photos save when the app is opened from your Claude link (the home-screen version).</p>')
  +(first&&latest&&first!==latest?'<div class="eyebrow" style="margin-top:8px">Then vs now</div><div class="photo-grid" style="grid-template-columns:1fr 1fr">'+photoImg(first,'front')+photoImg(latest,'front')+'</div>':'')
  +(photos.length?'<div class="stack" style="margin-top:10px">'+photos.slice(0,6).map(p=>'<div><div class="small muted">'+fmtDate(p.date)+'</div><div class="photo-grid">'+['front','side','back'].map(k=>p.photos[k]?photoImg(p,k):'<div class="ph" data-photo-date="'+p.date+'" data-pose="'+k+'">'+k+'</div>').join('')+'</div></div>').join('')+'</div>':'<div class="photo-grid" style="margin-top:8px">'+['front','side','back'].map(k=>'<div class="ph" data-pose="'+k+'">'+k+'<br>tap to add</div>').join('')+'</div>')+'</div>';
};
function photoImg(p,k){return '<img src="/_blob/'+esc(p.photos[k])+'" alt="'+k+' '+fmtDate(p.date)+'" loading="lazy">';}
Views.body.bind=function(v){
  const t=todayISO();
  $('#b-save',v).onclick=()=>{const b=S.body[t]||{id:t,date:t};const w=num($('#b-w',v).value),wa=num($('#b-waist',v).value),st=num($('#b-steps',v).value);if(w)b.weightLb=round(w,1);else delete b.weightLb;if(wa)b.waistIn=round(wa,1);else delete b.waistIn;if(st)b.steps=Math.round(st);else delete b.steps;save('body',t,b);toast('Saved');render();};
  $$('[data-range]',v).forEach(b=>b.onclick=()=>{S.ui.bodyRange=+b.dataset.range;render();});
  const ph=$('#b-photo',v);if(ph)ph.onchange=e=>uploadPhotos(Array.from(e.target.files||[]),t);
  $$('.ph[data-pose]',v).forEach(el=>el.onclick=()=>{if(!Caps.assets)return toast('Open the app from your Claude link to add photos');const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=()=>uploadPhotos(Array.from(inp.files||[]),el.dataset.photoDate||t,el.dataset.pose);inp.click();});
};
async function uploadPhotos(files,date,pose){
  if(!files.length)return;if(!Caps.assets)return toast('Photos need the home-screen version of the app');
  const b=S.body[date]||{id:date,date};b.photos=b.photos||{};const poses=['front','side','back'];let i=0;
  for(const f of files){const key=pose||poses.find(k=>!b.photos[k])||('extra'+(i++));try{toast('Uploading '+key+'…');const blob=await shrinkImage(f,1400);const res=await Caps.assets.upload(blob,{type:'image/jpeg'});b.photos[key]=res.id;save('body',date,b);}catch(e){console.warn(e);toast(e&&e.code==='quota_or_state'?'Photo storage is full':'Upload failed: '+(e&&e.code||'error'));}}
  render();
}
function shrinkImage(file,max){return new Promise(res=>{try{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const sc=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>res(b||file),'image/jpeg',0.85);};img.onerror=()=>res(file);img.src=u;}catch(e){res(file);}});}
function bodyQuickSheet(kind){const t=todayISO(),b=S.body[t]||{};sheet('<div class="h2">'+(kind==='steps'?'Steps today':'Weight today')+'</div><div class="field"><label>'+(kind==='steps'?'From your phone or watch':'lb, morning')+'</label><input class="input num" id="q-v" type="number" inputmode="'+(kind==='steps'?'numeric':'decimal')+'" value="'+(kind==='steps'?(b.steps||''):(b.weightLb||''))+'" autofocus></div><div class="grid2"><button class="btn" id="q-no">Cancel</button><button class="btn primary" id="q-ok">Save</button></div>',p=>{$('#q-no',p).onclick=closeSheet;$('#q-ok',p).onclick=()=>{const v=num($('#q-v',p).value);const doc=S.body[t]||{id:t,date:t};if(kind==='steps')doc.steps=Math.round(v);else doc.weightLb=round(v,1);save('body',t,doc);closeSheet();toast('Saved');render();};});}

// ===================== VIEW: FOOD =====================
Views.food=function(){
  const d=S.ui.foodDate||todayISO();const day=foodDay(d);const tot=dayTotals(d);const kt=kcalTarget();
  const byMeal={};for(const m of MEALS)byMeal[m]=[];for(const e of day.entries){(byMeal[e.meal]||(byMeal[e.meal]=[])).push(e);}
  const week=[];for(let i=6;i>=0;i--){const x=addDays(d,-i);const t=dayTotals(x);week.push({label:WD[parseISO(x).getDay()][0],v:t.kcal,p:t.p,logged:foodDay(x).entries.length>0});}
  const logged=week.filter(w=>w.logged);const avgK=logged.length?Math.round(logged.reduce((a,w)=>a+w.v,0)/logged.length):0,avgP=logged.length?Math.round(logged.reduce((a,w)=>a+w.p,0)/logged.length):0;
  const ai=!!Caps.sample;const img=!!(Caps.limits&&Caps.limits.images);
  return '<div class="dayhead"><div><div class="eyebrow disp">Nutrition</div><div class="h1" style="margin-top:6px">'+(d===todayISO()?'Today':fmtDate(d))+'</div></div><div class="nav"><button class="iconbtn" id="f-prev">'+ICON.back+'</button><button class="iconbtn" id="f-next"'+(d>=todayISO()?' disabled':'')+'>'+ICON.chev+'</button></div></div>'
  +'<div class="card"><div class="rings">'+ring(tot.kcal,kt,'kcal','var(--accent)')+ring(tot.p,S.profile.protein,'protein','var(--bronze)','g')+ring(tot.c,S.profile.carbs,'carbs','var(--good)','g')+ring(tot.f,S.profile.fat,'fat','var(--warn)','g')+'</div><p class="note" style="margin-top:8px;text-align:center">'+(kt-tot.kcal>0?Math.round(kt-tot.kcal)+' kcal left · '+Math.max(0,Math.round(S.profile.protein-tot.p))+' g protein to go':Math.round(tot.kcal-kt)+' kcal over · fine once a week, planned')+'</p></div>'
  +'<div class="grid2"><button class="btn primary" id="f-photo"'+(ai&&img?'':' disabled')+'>'+ICON.camera+' Photo</button><button class="btn" id="f-describe"'+(ai?'':' disabled')+'>Describe it</button><button class="btn" id="f-saved">Saved meals</button><button class="btn" id="f-manual">'+ICON.plus+' Manual</button></div>'
  +(ai?'':'<p class="note">AI photo and text estimates work when the app is opened from your Claude link.</p>')
  +'<div class="card">'+(day.entries.length?MEALS.concat(Object.keys(byMeal).filter(m=>!MEALS.includes(m))).filter(m=>byMeal[m]&&byMeal[m].length).map(m=>'<div class="eyebrow" style="margin-top:6px">'+esc(m)+' · '+Math.round(byMeal[m].reduce((a,e)=>a+num(e.kcal),0))+' kcal</div><div class="list">'+byMeal[m].map(e=>'<div class="item clickable" data-entry="'+e.id+'">'+(e.thumb?'<img class="thumb" src="'+e.thumb+'" alt="">':'')+'<div class="grow"><div class="t" style="font-weight:500">'+esc(e.name)+'</div><div class="s">'+Math.round(num(e.p))+'P · '+Math.round(num(e.c))+'C · '+Math.round(num(e.f))+'F'+(e.source==='ai'?' · AI estimate':'')+'</div></div><div class="num">'+Math.round(num(e.kcal))+'</div></div>').join('')+'</div>').join(''):'<div class="empty"><b>Nothing logged '+(d===todayISO()?'yet today':'this day')+'</b>Snap the plate, describe it, or pick a saved meal.</div>')+'</div>'
  +'<div class="card flat"><div class="row between"><div><div class="eyebrow">Water</div><div class="h3">'+(day.water||0)+' / '+S.profile.waterL+' L</div></div><div class="row"><button class="btn sm" id="f-wminus">−0.5</button><button class="btn sm primary" id="f-wplus">+0.5 L</button></div></div></div>'
  +'<div class="card"><div class="row between"><div class="eyebrow">Last 7 days · kcal</div><span class="pill">'+(logged.length?'avg '+avgK+' kcal · '+avgP+' g protein':'no days logged')+'</span></div>'+barChart({bars:week,target:kt,h:120})+'<p class="note">Log at least 4 days a week so the coach can estimate your real expenditure.</p></div>';
};
Views.food.bind=function(v){
  const d=S.ui.foodDate||todayISO();
  $('#f-prev',v).onclick=()=>{S.ui.foodDate=addDays(d,-1);render();};$('#f-next',v).onclick=()=>{S.ui.foodDate=addDays(d,1);render();};
  $('#f-photo',v).onclick=()=>photoFoodSheet(d);$('#f-describe',v).onclick=()=>describeFoodSheet(d);$('#f-saved',v).onclick=()=>savedMealsSheet(d);$('#f-manual',v).onclick=()=>manualFoodSheet(d);
  $('#f-wplus',v).onclick=()=>{const day=foodDay(d);day.water=round(num(day.water)+0.5,1);save('food',d,day);render();};$('#f-wminus',v).onclick=()=>{const day=foodDay(d);day.water=Math.max(0,round(num(day.water)-0.5,1));save('food',d,day);render();};
  $$('[data-entry]',v).forEach(b=>b.onclick=()=>editEntrySheet(d,b.dataset.entry));
};
function defaultMeal(){const h=new Date().getHours();return h<10.5?'Breakfast':h<14.5?'Lunch':h<17.5?'Snack':h<21?'Dinner':'Evening';}
function mealSelect(id,cur){return '<select class="input" id="'+id+'">'+MEALS.map(m=>'<option'+(m===(cur||defaultMeal())?' selected':'')+'>'+m+'</option>').join('')+'</select>';}
function addEntries(d,items,meal,source,thumb){const day=foodDay(d);for(const it of items){day.entries.push({id:uid(),meal,name:it.name,kcal:round(num(it.kcal),0),p:round(num(it.p),0),c:round(num(it.c),0),f:round(num(it.f),0),grams:it.grams||null,source:source||'manual',thumb:thumb||undefined,at:Date.now()});}save('food',d,day);}
function itemsEditor(items){return '<div class="stack tight" id="it-list">'+items.map((it,i)=>'<div class="card flat" data-i="'+i+'" style="padding:10px"><div class="row between"><input class="input" data-k="name" value="'+esc(it.name)+'" style="flex:1;min-height:38px;font-size:14px"><button class="iconbtn" data-del style="width:32px;height:32px">'+ICON.x+'</button></div><div class="grid4" style="margin-top:6px">'+[['kcal','kcal'],['p','P g'],['c','C g'],['f','F g']].map(([k,l])=>'<div class="field"><label>'+l+'</label><input class="input num" data-k="'+k+'" type="number" inputmode="decimal" value="'+round(num(it[k]),0)+'" style="font-size:16px;min-height:38px"></div>').join('')+'</div>'+(it.grams?'<div class="small muted" style="margin-top:4px">~'+Math.round(it.grams)+' g</div>':'')+'</div>').join('')+'</div>';}
function readItems(p){return $$('#it-list [data-i]',p).map(el=>({name:$('[data-k="name"]',el).value.trim()||'Food',kcal:num($('[data-k="kcal"]',el).value),p:num($('[data-k="p"]',el).value),c:num($('[data-k="c"]',el).value),f:num($('[data-k="f"]',el).value)}));}
function bindItemDelete(p,items,rerenderFn){$$('#it-list [data-del]',p).forEach(b=>b.onclick=()=>{const i=+b.closest('[data-i]').dataset.i;items.splice(i,1);rerenderFn();});}
const FOOD_PROMPT=(desc)=>'You are a sports dietitian estimating a meal for an athlete who is cutting. '+(desc?'The person describes it as: "'+desc.replace(/"/g,"'")+'". ':'')+'Identify each food item visible, estimate the portion in grams using plate, hand or utensil size for scale, and estimate calories and macros. Include cooking oils, dressings and sauces explicitly as their own items when they are likely present; photo estimates usually miss them. Reply with only JSON of this exact shape: {"items":[{"name":"Grilled chicken breast","grams":180,"kcal":300,"p":56,"c":0,"f":7}],"confidence":"low|medium|high","note":"one short sentence on what was uncertain"}. Numbers must be plain numbers.';
const TEXT_PROMPT=(desc)=>'You are a sports dietitian. Estimate the calories and macros for this meal description from an athlete who is cutting: "'+desc.replace(/"/g,"'")+'". Split it into separate items with portion in grams where sensible (use typical restaurant or home portions if unspecified; include cooking fat and sauces). Reply with only JSON of this exact shape: {"items":[{"name":"Rice, 1 cup cooked","grams":160,"kcal":205,"p":4,"c":45,"f":1}],"confidence":"low|medium|high","note":"one short sentence on assumptions"}. Numbers must be plain numbers.';
function normalizeItems(res){const arr=res&&Array.isArray(res.items)?res.items:Array.isArray(res)?res:[];return arr.map(x=>({name:String(x.name||'Food'),grams:num(x.grams,0)||null,kcal:num(x.kcal),p:num(x.p!=null?x.p:x.protein_g),c:num(x.c!=null?x.c:x.carbs_g),f:num(x.f!=null?x.f:x.fat_g)}));}
function photoFoodSheet(d){
  let file=null,thumb=null,items=null,ctl=null;const accept=(Caps.limits&&Caps.limits.images&&Caps.limits.images.mediaTypes||['image/jpeg','image/png','image/webp']).join(',');
  const draw=()=>{sheet('<div class="h2">Photo estimate</div>'+(file?'<div class="row"><img class="thumb" src="'+thumb+'" alt="" style="width:72px;height:72px"><div class="grow small muted">'+esc(file.name||'photo')+'</div><button class="btn sm" id="pf-change">Change</button></div>':'<label class="btn primary block">'+ICON.camera+' Take or choose a photo<input type="file" id="pf-file" accept="'+accept+'" capture="environment" hidden></label>')
    +'<div class="field"><label for="pf-desc">Anything the camera can\'t see (optional)</label><input class="input" id="pf-desc" placeholder="e.g. 200 g chicken, cooked in 1 tbsp oil"></div><div class="grid2"><div class="field"><label>Meal</label>'+mealSelect('pf-meal')+'</div><div class="field"><label>&nbsp;</label><button class="btn primary" id="pf-go"'+(file?'':' disabled')+'>Analyze</button></div></div><div id="pf-out"></div><button class="btn" id="pf-close">Close</button>',p=>{
      const fi=$('#pf-file',p);if(fi)fi.onchange=async e=>{file=e.target.files&&e.target.files[0];if(!file)return;thumb=await thumbFrom(file,160);draw();};
      const ch=$('#pf-change',p);if(ch)ch.onclick=()=>{file=null;thumb=null;items=null;draw();};
      $('#pf-close',p).onclick=()=>{if(ctl)ctl.abort();closeSheet();};
      $('#pf-go',p).onclick=async()=>{const out=$('#pf-out',p);out.innerHTML='<div class="row" style="padding:10px 0"><span class="spin"></span><span class="muted">Claude is looking at the plate…</span></div>';$('#pf-go',p).disabled=true;ctl=new AbortController();
        try{const res=await Caps.sample.json(FOOD_PROMPT($('#pf-desc',p).value.trim()),{images:[file],modelTier:'default',signal:ctl.signal});items=normalizeItems(res);renderItems(p,res);}
        catch(e){out.innerHTML='<p class="note" style="color:var(--bad)">'+esc(sampleErrorText(e)||'Could not analyze')+'</p>';$('#pf-go',p).disabled=false;}
      };
    });};
  const renderItems=(p,res)=>{const out=$('#pf-out',p);const rr=()=>{out.innerHTML='<div class="row between"><div class="eyebrow">'+items.length+' items · '+Math.round(items.reduce((a,i)=>a+i.kcal,0))+' kcal'+(res&&res.confidence?' · '+esc(res.confidence)+' confidence':'')+'</div></div>'+(res&&res.note?'<p class="note">'+esc(res.note)+'</p>':'')+itemsEditor(items)+'<button class="btn primary block" id="pf-add" style="margin-top:8px">'+ICON.plus+' Add to '+esc($('#pf-meal',p).value)+'</button>';bindItemDelete(out,items,rr);$('#pf-add',out).onclick=()=>{addEntries(d,readItems(out),$('#pf-meal',p).value,'ai',thumb);closeSheet();toast('Logged');render();};};rr();};
  draw();
}
function describeFoodSheet(d){
  let items=null,ctl=null;
  sheet('<div class="h2">Describe the meal</div><div class="field"><label for="df-desc">In words</label><textarea class="input" id="df-desc" placeholder="Milanesa al horno, a cup of rice, salad with a tablespoon of olive oil"></textarea></div><div class="grid2"><div class="field"><label>Meal</label>'+mealSelect('df-meal')+'</div><div class="field"><label>&nbsp;</label><button class="btn primary" id="df-go">Estimate</button></div></div><div id="df-out"></div><button class="btn" id="df-close">Close</button>',p=>{
    $('#df-close',p).onclick=()=>{if(ctl)ctl.abort();closeSheet();};
    $('#df-go',p).onclick=async()=>{const desc=$('#df-desc',p).value.trim();if(!desc)return;const out=$('#df-out',p);out.innerHTML='<div class="row" style="padding:10px 0"><span class="spin"></span><span class="muted">Estimating…</span></div>';ctl=new AbortController();
      try{const res=await Caps.sample.json(TEXT_PROMPT(desc),{modelTier:'quick',signal:ctl.signal});items=normalizeItems(res);const rr=()=>{out.innerHTML='<div class="eyebrow">'+items.length+' items · '+Math.round(items.reduce((a,i)=>a+i.kcal,0))+' kcal</div>'+(res&&res.note?'<p class="note">'+esc(res.note)+'</p>':'')+itemsEditor(items)+'<button class="btn primary block" id="df-add" style="margin-top:8px">'+ICON.plus+' Add to '+esc($('#df-meal',p).value)+'</button>';bindItemDelete(out,items,rr);$('#df-add',out).onclick=()=>{addEntries(d,readItems(out),$('#df-meal',p).value,'ai');closeSheet();toast('Logged');render();};};rr();}
      catch(e){out.innerHTML='<p class="note" style="color:var(--bad)">'+esc(sampleErrorText(e)||'Could not estimate')+'</p>';}
    };
  });
}
function allMeals(){const custom=Object.values(S.meals);const seen=new Set(custom.map(m=>m.name));return custom.concat(SEED_MEALS.filter(m=>!seen.has(m.name)).map(m=>({...m,seed:true})));}
function savedMealsSheet(d){
  const list=allMeals();const draw=(q)=>{const f=q?list.filter(m=>m.name.toLowerCase().includes(q.toLowerCase())):list;
    sheet('<div class="h2">Saved meals</div><input class="input" id="sm-q" placeholder="Search" value="'+esc(q||'')+'"><div class="field"><label>Add to</label>'+mealSelect('sm-meal')+'</div><div class="list">'+f.map((m,i)=>'<div class="item"><div class="grow"><div class="t" style="font-weight:500">'+esc(m.name)+'</div><div class="s">'+Math.round(m.kcal)+' kcal · '+Math.round(m.p)+'P · '+Math.round(m.c)+'C · '+Math.round(m.f)+'F'+(m.seed?' · example':'')+'</div></div><button class="btn sm primary" data-add="'+i+'">Add</button>'+(m.seed?'':'<button class="iconbtn" data-rm="'+m.id+'" style="width:32px;height:32px">'+ICON.trash+'</button>')+'</div>').join('')+'</div><p class="note">Example portions come from your plan; your own meals get saved from any logged entry.</p><button class="btn" id="sm-close">Close</button>',p=>{
      $('#sm-q',p).oninput=e=>draw(e.target.value);$('#sm-close',p).onclick=closeSheet;
      $$('[data-add]',p).forEach(b=>b.onclick=()=>{const m=f[+b.dataset.add];addEntries(d,[m],$('#sm-meal',p).value,'saved');toast('Added '+m.name);render();});
      $$('[data-rm]',p).forEach(b=>b.onclick=()=>{remove('meals',b.dataset.rm);list.splice(list.findIndex(m=>m.id===b.dataset.rm),1);draw(q);});
    });};
  draw('');
}
function manualFoodSheet(d,entry){
  const e=entry||{};
  sheet('<div class="h2">'+(entry?'Edit entry':'Add food')+'</div><div class="field"><label for="mf-name">Name</label><input class="input" id="mf-name" value="'+esc(e.name||'')+'" placeholder="Chicken, rice and salad"></div><div class="grid4">'+[['kcal','kcal'],['p','P g'],['c','C g'],['f','F g']].map(([k,l])=>'<div class="field"><label>'+l+'</label><input class="input num" id="mf-'+k+'" type="number" inputmode="decimal" value="'+(e[k]!=null?round(num(e[k]),0):'')+'" style="font-size:18px"></div>').join('')+'</div><div class="field"><label>Meal</label>'+mealSelect('mf-meal',e.meal)+'</div><div class="grid2"><button class="btn" id="mf-no">Cancel</button><button class="btn primary" id="mf-ok">Save</button></div>'+(entry?'<div class="grid2"><button class="btn" id="mf-saveas">Save as a meal</button><button class="btn danger" id="mf-del">'+ICON.trash+' Delete</button></div>':''),p=>{
    const read=()=>({name:$('#mf-name',p).value.trim()||'Food',kcal:num($('#mf-kcal',p).value),p:num($('#mf-p',p).value),c:num($('#mf-c',p).value),f:num($('#mf-f',p).value),meal:$('#mf-meal',p).value});
    $('#mf-no',p).onclick=closeSheet;
    $('#mf-ok',p).onclick=()=>{const v=read();if(entry){Object.assign(entry,v);entry.source=entry.source==='ai'?'ai-edited':entry.source;save('food',d,foodDay(d));}else addEntries(d,[v],v.meal,'manual');closeSheet();toast('Saved');render();};
    const sa=$('#mf-saveas',p);if(sa)sa.onclick=()=>{const v=read();const id=uid();save('meals',id,{id,name:v.name,kcal:v.kcal,p:v.p,c:v.c,f:v.f,meal:v.meal,date:todayISO()});toast('Saved to your meals');};
    const de=$('#mf-del',p);if(de)de.onclick=()=>{const day=foodDay(d);day.entries=day.entries.filter(x=>x.id!==entry.id);save('food',d,day);closeSheet();render();};
  });
}
function editEntrySheet(d,id){const day=foodDay(d);const e=day.entries.find(x=>x.id===id);if(e)manualFoodSheet(d,e);}

// ===================== VIEW: COACH =====================
function expenditureEstimate(){
  const t=todayISO();const days=[];for(let i=13;i>=0;i--){const x=addDays(t,-i);const fd=foodDay(x);if(fd.entries.length)days.push({date:x,kcal:dayTotals(x).kcal});}
  const ws=weightSeries();const nowAvg=weekAvg(ws,t),prevAvg=weekAvg(ws,addDays(t,-7));
  if(days.length<4||nowAvg==null||prevAvg==null)return {ok:false,loggedDays:days.length,hasWeights:nowAvg!=null&&prevAvg!=null};
  const intake=days.reduce((a,d)=>a+d.kcal,0)/days.length;const deltaLb=nowAvg-prevAvg;const tdee=intake-deltaLb*3500/7;
  const cur=kcalTarget();const goalRate=-0.75;const ideal=Math.round((tdee+goalRate*3500/7)/10)*10;const bounded=Math.max(cur-150,Math.min(cur+150,ideal));
  return {ok:true,intake:Math.round(intake),deltaLb:round(deltaLb,2),tdee:Math.round(tdee/10)*10,recommended:Math.max(2000,bounded),projected:round((cur-tdee)*7/3500,2),loggedDays:days.length};
}
function coachSummary(){
  const t=todayISO(),w=weekOf(t);const ws=weightSeries().slice(-14);
  const wos=finishedWorkouts().filter(x=>x.date>=addDays(t,-14)).slice(0,8).map(x=>({date:x.date,day:x.label,sets:x.setsDone,volume:Math.round(x.volume||0),prs:(x.prs||[]).map(p=>p.name+' '+fmtSet(p.key,p)),top:x.exercises.filter(e=>e.main).map(e=>{const b=e.sets.reduce((a,s)=>setScore(e.key,s)>setScore(e.key,a)?s:a,e.sets[0]);return e.name+' '+fmtSet(e.key,b);}),notes:x.notes||undefined,light:x.light||undefined}));
  const runs=sorted('runs').filter(r=>r.date>=addDays(t,-14)).map(r=>({date:r.date,type:r.type,km:r.distanceM?round(r.distanceM/1000,2):undefined,time:fmtClock(r.durationS),pace:r.distanceM&&r.durationS?fmtPace(r.durationS/(r.distanceM/1000))+'/km':undefined,reps:r.reps&&r.reps.length?{n:r.reps.length,dist:r.reps[0].m,avg:fmtClock(r.reps.reduce((a,x)=>a+x.s,0)/r.reps.length),best:fmtClock(Math.min(...r.reps.map(x=>x.s)))}:undefined,notes:r.notes||undefined}));
  const food=[];for(let i=6;i>=0;i--){const x=addDays(t,-i);if(foodDay(x).entries.length){const d=dayTotals(x);food.push({date:x,kcal:Math.round(d.kcal),p:Math.round(d.p),c:Math.round(d.c),f:Math.round(d.f)});}}
  const steps=[];for(let i=6;i>=0;i--){const x=addDays(t,-i);const s=(S.body[x]||{}).steps;if(s)steps.push(s);}
  const waist=sorted('body',false).filter(b=>b.waistIn>0).slice(-4).map(b=>({date:b.date,in:b.waistIn}));
  const exp=expenditureEstimate();
  return {today:t,week:w,phase:phaseOf(w),profile:{age:35,heightIn:S.profile.heightIn,startWeightLb:S.profile.startWeightLb,targetWeightLb:S.profile.targetWeightLb,startBodyFat:S.profile.startBodyFat,targetBodyFat:S.profile.targetBodyFat,goal:S.profile.goal,calorieTarget:kcalTarget(),proteinTarget:S.profile.protein},program:'4 lifting days (Upper A Mon, Lower A Tue, Upper B Thu, Lower B Fri) + 3 runs (easy Tue, track Wed, long Sat); 12-week cut with ramp (w1-2), build (3-6), push (7-10), deload (11), test (12)',weights:ws,waist,workouts:wos,runs,nutrition:food,stepsLast7:steps,expenditure:exp.ok?exp:'insufficient data',planEdits:S.overrides.days||{},lastReview:(sorted('reviews')[0]||{}).assessment};
}
const REVIEW_PROMPT=(sum)=>'You are an elite strength and conditioning coach and sports dietitian reviewing the past week for a 35-year-old former professional soccer player, muscular, cutting from ~19% to ~14.5% body fat while keeping all muscle, who wants a V-taper, visible abs and his running engine back. Be specific, warm and direct; praise what was done, name what slipped, never shame. Use the data; if something is missing say what to log. Adjust calories only on the weight trend (7-day averages), not single weigh-ins, and change by at most 150 kcal; the rate target is 0.6–0.8 lb per week. Keep protein at 175 g. Training changes should be small (±1 set, a rep-range tweak, a swap for a nagging joint) and tied to a reason. Data (JSON):\n'+JSON.stringify(sum)+'\nReply with only JSON of this exact shape: {"assessment":"3-5 sentences","weight_trend":"one sentence with numbers","calorie_target":2450,"calorie_reason":"one sentence","training_changes":[{"day":"upperA|lowerA|upperB|lowerB","exercise_key":"lateral_raise","sets":5,"reps":"12–15","reason":"why"}],"running_note":"one or two sentences","next_week_focus":["three","short","bullets"]}. Use exercise_key values exactly from this list: '+Object.keys(EXERCISES).join(', ')+'. training_changes may be an empty array.';
Views.coach=function(){
  const t=todayISO(),w=weekOf(t);const exp=expenditureEstimate();const last=sorted('reviews')[0];const ai=!!Caps.sample;
  const chat=S.ui.chat||[];
  return '<div class="row between">'+backBtn('Back')+'<span class="pill bronze">'+esc(weekLabel(w))+'</span></div><div><div class="eyebrow disp">Coach</div><div class="h1" style="margin-top:6px">Weekly review</div></div>'
  +'<div class="card bronze"><div class="eyebrow disp">The goal</div><textarea class="input" id="c-goal" style="margin-top:6px;background:var(--surface)">'+esc(S.profile.goal)+'</textarea><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn sm" id="c-goal-save">Save goal</button></div></div>'
  +'<div class="card"><div class="eyebrow">Expenditure estimate · from intake and the weight trend</div>'+(exp.ok?'<div class="grid3" style="margin-top:8px"><div class="tile"><div class="v">'+exp.tdee.toLocaleString()+'</div><div class="l">kcal/day burned</div></div><div class="tile"><div class="v">'+exp.intake.toLocaleString()+'</div><div class="l">avg intake</div></div><div class="tile"><div class="v">'+(exp.deltaLb>0?'+':'')+exp.deltaLb+'</div><div class="l">lb this week</div></div></div><p class="note" style="margin-top:8px">At the current target of '+kcalTarget()+' kcal the projection is '+(exp.projected>0?'+':'')+exp.projected+' lb/week. '+(Math.abs(exp.recommended-kcalTarget())>=50?'Recommended target: <b>'+exp.recommended+' kcal</b> (changes are capped at 150 kcal per week).':'Holding: the target is right for the rate you want.')+'</p>'+(Math.abs(exp.recommended-kcalTarget())>=50?'<button class="btn primary sm" id="c-apply-kcal" data-kcal="'+exp.recommended+'" style="margin-top:6px">Apply '+exp.recommended+' kcal</button>':''):'<p class="note" style="margin-top:6px">Holding at '+kcalTarget()+' kcal. Needs 4+ logged food days in the last two weeks ('+exp.loggedDays+' so far) and two weeks of weigh-ins'+(exp.hasWeights?'':' (not yet)')+'. Then the app back-solves what you actually burn.</p>')+'</div>'
  +'<div class="card"><div class="row between"><div><div class="h3">AI review of the week</div><p class="note">Reads your lifts, runs, weight trend and food, then proposes small changes you can apply with a tap.</p></div></div><button class="btn primary block" id="c-review" style="margin-top:10px"'+(ai?'':' disabled')+'>'+ICON.coach+' Review this week</button>'+(ai?'':'<p class="note">Available when the app is opened from your Claude link.</p>')+'<div id="c-out" style="margin-top:10px">'+(last?reviewHtml(last):'')+'</div></div>'
  +'<div class="card"><div class="h3">Ask the coach</div><p class="note">Knows your plan and the last two weeks of data. Each message spends a little of your Claude usage.</p><div class="chat" id="c-chat" style="margin-top:8px">'+chat.map(m=>'<div class="msg '+(m.role==='user'?'me':'ai')+'">'+esc(m.content)+'</div>').join('')+'</div><div class="row" style="margin-top:8px"><input class="input" id="c-q" placeholder="My shoulder clicks on overhead press…"'+(ai?'':' disabled')+'><button class="btn primary" id="c-send"'+(ai?'':' disabled')+'>Send</button></div>'+(chat.length?'<button class="btn ghost sm" id="c-clear">Clear chat</button>':'')+'</div>';
};
function reviewHtml(r){return '<div class="callout" style="margin-top:4px"><div class="eyebrow b">'+(r.week?'Week '+r.week+' · ':'')+(r.date?fmtDate(r.date):'')+'</div><p style="margin-top:4px">'+esc(r.assessment||'')+'</p>'+(r.weight_trend?'<p class="small" style="margin-top:6px"><b>Weight:</b> '+esc(r.weight_trend)+'</p>':'')+(r.running_note?'<p class="small" style="margin-top:4px"><b>Running:</b> '+esc(r.running_note)+'</p>':'')+'</div>'
  +(r.calorie_target?'<div class="row between" style="margin-top:8px"><div class="small"><b>Calories:</b> '+r.calorie_target+' kcal · '+esc(r.calorie_reason||'')+'</div>'+(r.calorie_target!==kcalTarget()?'<button class="btn sm primary" data-apply-kcal="'+r.calorie_target+'">Apply</button>':'<span class="pill good">current</span>')+'</div>':'')
  +((r.training_changes||[]).length?'<div class="list" style="margin-top:6px">'+r.training_changes.map((c,i)=>'<div class="item"><div class="grow"><div class="t" style="font-weight:500">'+esc((EXERCISES[c.exercise_key]||{}).name||c.exercise_key)+' → '+(c.sets||'')+(c.reps?' × '+esc(c.reps):'')+'</div><div class="s">'+esc(c.reason||'')+'</div></div><button class="btn sm" data-apply-change="'+i+'">Apply</button></div>').join('')+'</div>':'')
  +((r.next_week_focus||[]).length?'<div class="eyebrow" style="margin-top:8px">Next week</div><div class="stack tight" style="margin-top:4px">'+r.next_week_focus.map(x=>'<div class="cue">'+esc(x)+'</div>').join('')+'</div>':'');}
Views.coach.bind=function(v){
  $('[data-back]',v).onclick=()=>go('today');
  $('#c-goal-save',v).onclick=()=>{saveProfile({goal:$('#c-goal',v).value.trim()||S.profile.goal});toast('Goal saved');};
  const ak=$('#c-apply-kcal',v);if(ak)ak.onclick=()=>{S.overrides.kcal=num(ak.dataset.kcal);saveOverrides();toast('Target: '+S.overrides.kcal+' kcal');render();};
  const bindReview=()=>{$$('[data-apply-kcal]',v).forEach(b=>b.onclick=()=>{S.overrides.kcal=num(b.dataset.applyKcal);saveOverrides();toast('Target: '+S.overrides.kcal+' kcal');render();});
    $$('[data-apply-change]',v).forEach(b=>b.onclick=()=>{const last=sorted('reviews')[0];const c=last&&last.training_changes[+b.dataset.applyChange];if(!c)return;const day=PROGRAM.order.includes(c.day)?c.day:PROGRAM.order.find(k=>PROGRAM.days[k].ex.some(e=>e.key===c.exercise_key));if(!day)return toast('Could not place that change');const slot=PROGRAM.days[day].ex.find(e=>e.key===c.exercise_key)?c.exercise_key:PROGRAM.days[day].ex[0].key;S.overrides.days=S.overrides.days||{};S.overrides.days[day]=S.overrides.days[day]||{};const prev=S.overrides.days[day][slot]||{};S.overrides.days[day][slot]={...prev,sets:c.sets||prev.sets,reps:c.reps||prev.reps,sub:slot!==c.exercise_key?c.exercise_key:prev.sub};saveOverrides();b.textContent='Applied';b.disabled=true;toast('Plan updated');});};
  bindReview();
  $('#c-review',v).onclick=async()=>{const out=$('#c-out',v);const btn=$('#c-review',v);btn.disabled=true;out.innerHTML='<div class="row" style="padding:10px 0"><span class="spin"></span><span class="muted">Reading the week… this takes up to a minute.</span></div>';
    try{const sum=coachSummary();const res=await Caps.sample.json(REVIEW_PROMPT(sum),{modelTier:'default',cache:false});const w=weekOf(todayISO());const r={id:'w'+w+'_'+uid(),week:w,date:todayISO(),assessment:String(res.assessment||''),weight_trend:String(res.weight_trend||''),calorie_target:num(res.calorie_target,0)||undefined,calorie_reason:String(res.calorie_reason||''),training_changes:Array.isArray(res.training_changes)?res.training_changes.filter(c=>c&&c.exercise_key).slice(0,5):[],running_note:String(res.running_note||''),next_week_focus:Array.isArray(res.next_week_focus)?res.next_week_focus.map(String).slice(0,3):[]};save('reviews',r.id,r);out.innerHTML=reviewHtml(r);bindReview();}
    catch(e){out.innerHTML='<p class="note" style="color:var(--bad)">'+esc(sampleErrorText(e)||'The review failed')+'</p>';}
    btn.disabled=false;};
  const send=async()=>{const q=$('#c-q',v).value.trim();if(!q)return;S.ui.chat=S.ui.chat||[];S.ui.chat.push({role:'user',content:q});$('#c-q',v).value='';const box=$('#c-chat',v);box.innerHTML+='<div class="msg me">'+esc(q)+'</div><div class="msg ai" id="c-stream">Thinking…</div>';
    const rules='You are the athlete\'s personal elite strength coach, running coach and sports dietitian inside his training app. Answer in his terms, short and specific (under 120 words unless he asks for detail), warm and direct, no disclaimers unless safety matters. His plan and recent data (JSON): '+JSON.stringify(coachSummary()).slice(0,20000);
    try{const turns=[{role:'user',content:rules},...S.ui.chat.slice(-10)];const {text}=await Caps.sample(turns,{cache:false,modelTier:'default',onText:({text})=>{const s=$('#c-stream');if(s)s.textContent=text;}});S.ui.chat.push({role:'assistant',content:text});const s=$('#c-stream');if(s){s.textContent=text;s.id='';}lsSet('olympus.ui',S.ui);}
    catch(e){const s=$('#c-stream');if(s)s.textContent=e&&e.text||sampleErrorText(e)||'No answer';S.ui.chat.pop();}
  };
  $('#c-send',v).onclick=send;$('#c-q',v).onkeydown=e=>{if(e.key==='Enter')send();};
  const cl=$('#c-clear',v);if(cl)cl.onclick=()=>{S.ui.chat=[];lsSet('olympus.ui',S.ui);render();};
};

// ===================== VIEW: SETTINGS =====================
Views.settings=function(){
  const p=S.profile;const F=(id,label,val,type,step)=>'<div class="field"><label for="s-'+id+'">'+label+'</label><input class="input" id="s-'+id+'" type="'+(type||'number')+'" '+(type==='number'||!type?'inputmode="decimal" step="'+(step||'any')+'"':'')+' value="'+esc(val)+'"></div>';
  return '<div class="row between">'+backBtn('Back')+'</div><div><div class="eyebrow disp">Settings</div><div class="h1" style="margin-top:6px">Plan and targets</div></div>'
  +'<div class="card"><div class="eyebrow">Program</div><div class="grid2" style="margin-top:8px">'+F('startDate','Week 1 starts (Monday)',p.startDate,'date')+'<div class="field"><label for="s-liftUnit">Lift unit</label><select class="input" id="s-liftUnit"><option'+(p.liftUnit==='lb'?' selected':'')+'>lb</option><option'+(p.liftUnit==='kg'?' selected':'')+'>kg</option></select></div><div class="field"><label for="s-fiveK">Current 5 km time (mm:ss)</label><input class="input" id="s-fiveK" type="text" inputmode="numeric" value="'+fmtClock(p.fiveKSec||1530)+'"></div></div><p class="note" style="margin-top:6px">Every running target (easy, tempo, rep times, the time-trial goal) is derived from this one number. Update it after a time trial.</p></div>'
  +'<div class="card"><div class="eyebrow">Body</div><div class="grid2" style="margin-top:8px">'+F('heightIn','Height (in)',p.heightIn)+F('startWeightLb','Start weight (lb)',p.startWeightLb)+F('targetWeightLb','Target weight (lb)',p.targetWeightLb)+F('targetBodyFat','Target body fat %',p.targetBodyFat)+F('stepsGoal','Steps goal',p.stepsGoal,'number','1')+F('waterL','Water goal (L)',p.waterL)+'</div></div>'
  +'<div class="card"><div class="eyebrow">Nutrition targets</div><div class="grid2" style="margin-top:8px">'+F('kcal','Calories',p.kcal,'number','1')+F('protein','Protein (g)',p.protein,'number','1')+F('carbs','Carbs (g)',p.carbs,'number','1')+F('fat','Fat (g)',p.fat,'number','1')+'</div>'+(S.overrides.kcal?'<p class="note" style="margin-top:6px">A coach adjustment of '+S.overrides.kcal+' kcal currently overrides the calorie target. <button class="btn ghost sm" id="s-clear-kcal">Remove</button></p>':'')+'</div>'
  +'<button class="btn primary block" id="s-save">'+ICON.check+' Save settings</button>'
  +'<div class="card"><div class="eyebrow">Data</div><p class="note" style="margin-top:6px">Everything is saved on this phone and, when opened from your Claude link, synced to your account so Claude can read it for coaching. '+Object.keys(S.workouts).length+' workouts · '+Object.keys(S.runs).length+' runs · '+Object.keys(S.body).length+' body entries · '+Object.keys(S.food).length+' food days.</p><div class="grid2" style="margin-top:8px"><button class="btn" id="s-export">Export JSON</button><button class="btn" id="s-resetplan">Reset plan edits</button></div><button class="btn danger block" id="s-wipe" style="margin-top:8px">'+ICON.trash+' Erase data on this device</button></div>';
};
Views.settings.bind=function(v){
  $('[data-back]',v).onclick=()=>go('today');
  $('#s-save',v).onclick=()=>{const g=id=>$('#s-'+id,v).value;const fk=g('fiveK').split(':').map(Number);const fiveKSec=fk.length===2&&!fk.some(isNaN)?fk[0]*60+fk[1]:S.profile.fiveKSec;saveProfile({fiveKSec,startDate:g('startDate')||S.profile.startDate,liftUnit:g('liftUnit'),heightIn:num(g('heightIn'),S.profile.heightIn),startWeightLb:num(g('startWeightLb'),S.profile.startWeightLb),targetWeightLb:num(g('targetWeightLb'),S.profile.targetWeightLb),targetBodyFat:num(g('targetBodyFat'),S.profile.targetBodyFat),stepsGoal:num(g('stepsGoal'),S.profile.stepsGoal),waterL:num(g('waterL'),S.profile.waterL),kcal:num(g('kcal'),S.profile.kcal),protein:num(g('protein'),S.profile.protein),carbs:num(g('carbs'),S.profile.carbs),fat:num(g('fat'),S.profile.fat)});toast('Settings saved');go('today');};
  const ck=$('#s-clear-kcal',v);if(ck)ck.onclick=()=>{delete S.overrides.kcal;saveOverrides();render();};
  $('#s-resetplan',v).onclick=()=>confirmSheet('Reset plan edits?','Swaps, set and rep changes go back to the original program. Your logs are kept.','Reset',()=>{S.overrides={};saveOverrides();toast('Plan reset');render();});
  $('#s-wipe',v).onclick=()=>confirmSheet('Erase everything on this device?','Your synced copy on Claude stays and will reload when you open the app from your link.','Erase',()=>{try{localStorage.clear();}catch(e){}location.reload();},true);
  $('#s-export',v).onclick=async()=>{const data=JSON.stringify({exportedAt:new Date().toISOString(),profile:S.profile,overrides:S.overrides,workouts:S.workouts,runs:S.runs,body:S.body,food:S.food,meals:S.meals,reviews:S.reviews},null,1);let dl=null;try{dl=window.claude&&window.claude.use?await claude.use('downloads'):null;}catch(e){}if(dl){try{await dl.save({filename:'olympus-export-'+todayISO()+'.json',data});toast('Export ready');}catch(e){toast('Export cancelled');}}else if(window.OLYMPUS_STANDALONE){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='olympus-export-'+todayISO()+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);toast('Export ready');}catch(e){toast('Export failed');}}else{try{await navigator.clipboard.writeText(data);toast('Copied the export to the clipboard');}catch(e){toast('Export is available from the home-screen version');}}};
};

// ===================== BOOT =====================
if(!Views[S.ui.tab])S.ui.tab='today';
render();
