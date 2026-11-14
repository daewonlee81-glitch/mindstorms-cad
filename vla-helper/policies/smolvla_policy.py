"""SmolVLA 정책 (실험 기능 — 우리 로봇 주행 기록으로 미세조정한 모델이 있을 때 사용).

사용:  uv run --with "lerobot[smolvla]" server.py --policy policies/smolvla_policy.py --model <학습한 모델 폴더>

  · 기본 모델(lerobot/smolvla_base)은 로봇 팔(SO100) 데이터로 학습되어 있어 그대로는 바퀴 로봇을 움직이지 못합니다.
    recordings/ 의 주행 기록을 LeRobot 데이터셋으로 바꿔 미세조정한 모델을 --model 로 주세요.
  · 모델의 행동(action) 2개 = [속도 mm/s, 회전 °/s], 상태(state) = [요 각도, 왼쪽 바퀴 각도, 오른쪽 바퀴 각도, 반사광…]
  · LeRobot 버전마다 불러오는 경로가 조금씩 달라 두 가지를 모두 시도합니다.
"""
NAME = "SmolVLA"
CAMERA_KEY = "observation.images.front"


def load(model, device):
    import torch  # noqa: F401
    try:
        from lerobot.policies.smolvla.modeling_smolvla import SmolVLAPolicy  # 새 버전
    except ImportError:
        from lerobot.common.policies.smolvla.modeling_smolvla import SmolVLAPolicy  # 예전 버전
    if not model:
        raise SystemExit("--model 에 학습한 모델 폴더(또는 Hugging Face 이름)를 주세요")
    policy = SmolVLAPolicy.from_pretrained(model)
    policy.to(device).eval()
    policy.reset()
    return {"policy": policy, "device": device, "task": None}


def _state_vec(state):
    v = [state.get("yaw", 0.0), state.get("left", 0.0), state.get("right", 0.0)]
    v += list(state.get("reflect", []))[:2]
    while len(v) < 5:
        v.append(0.0)
    return v


def act(S, img, task, state):
    import torch
    p, dev = S["policy"], S["device"]
    if task != S["task"]:  # 지시가 바뀌면 처음부터
        p.reset()
        S["task"] = task
    x = torch.from_numpy(img).float().div(255).permute(2, 0, 1).unsqueeze(0).to(dev)
    batch = {
        CAMERA_KEY: x,
        "observation.state": torch.tensor([_state_vec(state)], dtype=torch.float32, device=dev),
        "task": [task],
    }
    with torch.inference_mode():
        a = p.select_action(batch)[0].tolist()
    return [[round(a[0]), round(a[1])]], "SmolVLA"
