vec4 baseColor = u_baseColor;
#ifdef HILO_BASE_COLOR_MAP
    baseColor *= HILO_TEXTURE_2D(u_baseColorMap);
#endif

#if defined(HILO_HAS_COLOR)
    baseColor *= v_color;
#endif

color.a = baseColor.a;

#pragma glslify: import('./transparency_main.frag');

#ifdef HILO_HAS_LIGHT
    vec3 viewPos = vec3(0, 0, 0);
    vec3 N = normal;
    vec3 V = normalize(viewPos - v_fragPos);

    #ifdef HILO_OCCLUSION_MAP
        float ao  = HILO_TEXTURE_2D(u_occlusionMap).r;
    #else
        float ao = 1.0;
    #endif

    #ifdef HILO_PBR_SPECULAR_GLOSSINESS
        vec3 specular = u_specular.rgb;
        float glossiness = u_glossiness;
        #ifdef HILO_SPECULAR_GLOSSINESS_MAP
            vec4 specularGlossiness = HILO_TEXTURE_2D(u_specularGlossinessMap);
            specular = specularGlossiness.rgb * specular;
            glossiness = specularGlossiness.a * glossiness;
        #endif
        float roughness = 1.0 - glossiness;
        float metallic = 0.0;
        vec3 diffuseColor = baseColor.rgb * (1.0 - max(max(specular.r, specular.g), specular.b));
        vec3 specularColor = specular;
    #else
        float metallic = u_metallic;
        float roughness = u_roughness;
        #ifdef HILO_METALLIC_MAP
            metallic = HILO_TEXTURE_2D(u_metallicMap).r * u_metallic;
        #endif
        #ifdef HILO_ROUGHNESS_MAP
            roughness  = HILO_TEXTURE_2D(u_roughnessMap).r * u_roughness;
        #endif
        #ifdef HILO_METALLIC_ROUGHNESS_MAP
            vec4 metallicRoughnessMap = HILO_TEXTURE_2D(u_metallicRoughnessMap);
            #ifdef HILO_IS_OCCLUSION_MAP_IN_METALLIC_ROUGHNESS_MAP
                ao = metallicRoughnessMap.r;
            #endif
            roughness = metallicRoughnessMap.g * u_roughness;
            metallic = metallicRoughnessMap.b * u_metallic;
        #endif
        roughness = clamp(roughness, 0.04, 1.0);
        metallic = clamp(metallic, 0.0, 1.0);
        vec3 f0 = vec3(0.04);
        vec3 diffuseColor = baseColor.rgb * (vec3(1.0) - f0);
        diffuseColor *= 1.0 - metallic;
        vec3 specularColor = mix(f0, baseColor.rgb, metallic);
    #endif


    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);
    // For typical incident reflectance range (between 4% to 100%) set the grazing reflectance to 100% for typical fresnel effect.
    // For very low reflectance range on highly diffuse objects (below 4%), incrementally reduce grazing reflecance to 0%.
    float reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
    vec3 specularEnvironmentR0 = specularColor.rgb;
    vec3 specularEnvironmentR90 = vec3(1.0, 1.0, 1.0) * reflectance90;

    PBRInfo pbrInputs = PBRInfo(
        .0,
        clamp(abs(dot(N, V)), 0.001, 1.0),
        .0,
        .0,
        .0,
        roughness,
        metallic,
        specularEnvironmentR0,
        specularEnvironmentR90,
        roughness * roughness,
        diffuseColor,
        specularColor
    );

    #ifdef HILO_DIRECTIONAL_LIGHTS
        for(int i = 0;i < HILO_DIRECTIONAL_LIGHTS;i++){
            vec3 L = normalize(-u_directionalLightsInfo[i]);
            vec3 radiance = u_directionalLightsColor[i];
            float shadow = 1.0;
            #ifdef HILO_DIRECTIONAL_LIGHTS_SMC
                if (i < HILO_DIRECTIONAL_LIGHTS_SMC) {
                    float bias = max(u_directionalLightsShadowBias[i][1] * (1.0 - dot(N, L)), u_directionalLightsShadowBias[i][0]);
                    shadow = getShadow(u_directionalLightsShadowMap[i], u_directionalLightsShadowMapSize[i], bias, v_fragPos, u_directionalLightSpaceMatrix[i]);
                }
            #endif
            color.rgb += ao * shadow * radiance * calculateLo(pbrInputs, N, V, L);
        }
    #endif

    #ifdef HILO_SPOT_LIGHTS
        for(int i = 0; i < HILO_SPOT_LIGHTS; i++){
            vec3 lightDir = normalize(-u_spotLightsDir[i]);
            vec3 distanceVec = u_spotLightsPos[i] - v_fragPos;

            float theta = dot(normalize(distanceVec), lightDir);
            float epsilon = u_spotLightsCutoffs[i][0] - u_spotLightsCutoffs[i][1];
            float intensity = clamp((theta - u_spotLightsCutoffs[i][1]) / epsilon, 0.0, 1.0);
            float attenuation = getLightAttenuation(distanceVec, u_spotLightsInfo[i]);
            vec3 radiance = intensity * attenuation * u_spotLightsColor[i];

            float shadow = 1.0;
            #ifdef HILO_SPOT_LIGHTS_SMC
                if (i < HILO_SPOT_LIGHTS_SMC) {
                    float bias = max(u_spotLightsShadowBias[i][1] * (1.0 - dot(N, lightDir)), u_spotLightsShadowBias[i][0]);
                    shadow = getShadow(u_spotLightsShadowMap[i], u_spotLightsShadowMapSize[i], bias, v_fragPos, u_spotLightSpaceMatrix[i]);
                }
            #endif
            color.rgb += ao * shadow * radiance * calculateLo(pbrInputs, N, V, lightDir);
        }
    #endif

    #ifdef HILO_POINT_LIGHTS
        for(int i = 0; i < HILO_POINT_LIGHTS; i++){
            vec3 distanceVec = u_pointLightsPos[i] - v_fragPos;
            vec3 lightDir = normalize(distanceVec);

            float shadow = 1.0;
            #ifdef HILO_POINT_LIGHTS_SMC
                if (i < HILO_POINT_LIGHTS_SMC) {
                    float bias = max(u_pointLightsShadowBias[i][1] * (1.0 - dot(normal, lightDir)), u_pointLightsShadowBias[i][0]);
                    shadow = getShadow(u_pointLightsShadowMap[i], bias, distanceVec, u_pointLightSpaceMatrix[i]);
                }
            #endif

            float attenuation = getLightAttenuation(distanceVec, u_pointLightsInfo[i]);
            vec3 radiance = attenuation * u_pointLightsColor[i];

            color.rgb += ao * shadow * radiance * calculateLo(pbrInputs, N, V, lightDir);
        }
    #endif

    #ifdef HILO_LIGHT_MAP
        color.rgb += baseColor.rgb * HILO_TEXTURE_2D(u_lightMap).rgb;
    #endif

    // IBL
    color.rgb += ao * getIBLContribution(pbrInputs, N, V);

    #if defined(HILO_AMBIENT_LIGHTS) && !defined(HILO_DIFFUSE_ENV_MAP)
        color.rgb += u_ambientLightsColor * baseColor.rgb * ao;
    #endif

    #ifdef HILO_EMISSION_MAP
        color.rgb += HILO_TEXTURE_2D(u_emission).rgb;
    #endif
#else
    color = baseColor;
#endif