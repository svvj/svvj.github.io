---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

[Download my CV as a PDF]({{ base_path }}/assets/files/CV.pdf)

Education
======
* **Ph.D. Candidate**, University of Melbourne, Melbourne, Australia (Aug 2024 – Present)
  * Research: Large-space modeling and rendering for free-view navigation
* **M.S. in Artificial Intelligence Applications**, Korea University, Seoul, South Korea (Mar 2022 – Feb 2024)
  * GPA: 4.11/4.5 (95.5%)
  * Research topic: Computer Graphics, Physics-Based Simulation
  * Thesis: *A Hybrid Iterative Algorithm for Solving Constraint Optimization Problems*
* **B.E. in Computer Science and Engineering**, Korea University, Seoul, South Korea (Mar 2016 – Feb 2022)
  * GPA: 3.65/4.5 (91.5%); Interdisciplinary Major in Artificial Intelligence (subsidiary)

Research interests
======
* Computer graphics, 3D Gaussian Splatting, and neural rendering
* Novel-view synthesis and free-view navigation for large spaces
* Sampling and perceptual quality in radiance-field rendering (NeRF / 3DGS)
* Mixed reality, augmented reality, and immersive XR
* Visual effects (VFX)
* Human-computer interaction

Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>

Work experience
======
* **Teaching Assistant / Tutor**, University of Melbourne (2025 & 2026)
  * Graphics and Interaction (COMP30019), Semester 2 of 2025 and 2026: tutorials and consultations on real-time 2D/3D graphics, Unity, and shader programming, plus assessment and feedback for project-based coursework
* **Research Engineer**, Next-generation VR/AR Research Institute, Korea University (Mar 2024 – Aug 2024)
  * Led research improvements for the Digital Human project
  * Developed physics-based and learning-based components for virtual humans and clothing simulation
* **Teaching Assistant**, Computer Graphics Course, Korea University (Mar 2022 – Jul 2022)
  * Designed OpenGL-based programming assignments on character animation and ray tracing
* **Backend Developer**, Joanholab Co. (Nov 2019 – Jun 2020)
  * Led backend development, login authentication, database management, and deployment

Projects
======
* **Flashover: Spatial Storytelling of Wildfire** — University of Melbourne (2025–2026): Immersive multi-zone VR installation recreating firefighters' Black Summer bushfire memories with point-based volumetric imagery, in close collaboration with the Faculty of Fine Arts and Music (FFAM); exhibited at ACM SIGGRAPH 2026 Experience Hall *(Unity, VR/XR)*
* **Digital Human Project** — Korea University (2023–2024): Real-time virtual human and clothing from RGB footage, combining physics-based simulation with deep learning *(Python, PyTorch, Taichi, OpenGL)*
* **Physics-Based Simulation Framework** — Korea University (2023): Simulation framework with OBJ I/O, a custom renderer, and numerical solvers for constraint optimization *(C++, OpenGL)*
* **Differentiable Flag** — Korea University (2021–2022): Differentiable physics simulation reconstructing flag motions from RGB video and 3D reconstructions *(Python, PyTorch, PyTorch3D)*

Awards & scholarships
======
* **Best Research Award**, VR·AR Research Contest, Korea Electronics Association (2023)
* **Melbourne Research Scholarship** (stipend and fee offset), University of Melbourne (2024–Present)
* **Student Creative and Independent Project Grant**, ITRC Support Program (2022)
* **Dang-Rim Scholarship** (2021); **Full undergraduate scholarship**, National Grant (2016–2017, 2020–2021)

Skills
======
* **Programming:** C++, C, Python, CUDA, C#, JavaScript, TypeScript
* **Graphics & ML:** OpenGL, Shaders (GLSL/HLSL), PyTorch, OpenCV, Taichi
* **Game engine & XR:** Unity, VR/XR development, OpenXR
* **Tools:** Linux, Windows, Docker, Git, Visual Studio, VS Code, Blender, LaTeX

Languages
======
* Korean (mother tongue), English (TOEFL iBT 88)
