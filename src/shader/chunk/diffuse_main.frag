#if defined(HILO_DIFFUSE_MAP)
    diffuse = hiloTexture2D(u_diffuse);
#elif defined(HILO_DIFFUSE_CUBE_MAP)
    diffuse = textureCube(u_diffuse, v_position);
#elif defined(HILO_HAS_COLOR)
    diffuse = v_color;
#else
    diffuse = u_diffuse;
#endif
color.a = diffuse.a;