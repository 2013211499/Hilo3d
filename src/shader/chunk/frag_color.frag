color.rgb *= color.a;

#ifdef HILO_USE_HDR
    color.rgb = vec3(1.0) - exp(-color.rgb * u_exposure);
#endif

gl_FragColor = color;